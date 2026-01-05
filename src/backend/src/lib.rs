#![allow(deprecated)]
// IC-Commerce Backend
// Database schema and design inspired by Solidus e-commerce
// https://github.com/solidusio/solidus
// Copyright (c) Spree Commerce Inc. / Solidus contributors
// Licensed under BSD-3-Clause

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{init, post_upgrade, pre_upgrade, export_candid};
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
};
use ic_rusqlite::{close_connection, with_connection, Connection};

mod types;
mod api;

use types::*;

static MIGRATIONS: &[ic_sql_migrate::Migration] = ic_sql_migrate::include_migrations!();

fn run_migrations() {
    with_connection(|mut conn| {
        let conn: &mut Connection = &mut conn;
        if let Err(e) = ic_sql_migrate::sqlite::migrate(conn, MIGRATIONS) {
            ic_cdk::trap(&format!("Migration failed: {:?}", e));
        }
    });
}

fn now() -> i64 {
    ic_cdk::api::time() as i64
}

fn generate_order_number() -> String {
    let timestamp = (ic_cdk::api::time() / 1_000_000) as u64; // ms
    format!("R{:012X}", timestamp)
}

fn generate_shipment_number() -> String {
    let timestamp = (ic_cdk::api::time() / 1_000_000) as u64;
    format!("H{:012X}", timestamp)
}

#[init]
fn canister_init() { run_migrations(); }

#[pre_upgrade]
fn pre_upgrade() { close_connection(); }

#[post_upgrade]
fn post_upgrade() { run_migrations(); }

// ============================================
// AUTH: First user becomes admin
// ============================================

#[derive(CandidType, Deserialize, Clone, PartialEq, Debug)]
pub enum UserRole {
    Admin,
    Customer,
    Guest,
}

#[ic_cdk::update]
fn initialize_auth() -> Result<AuthResult, String> {
    let caller_principal = ic_cdk::api::caller();
    let caller_str = caller_principal.to_string();

    // Use proper IC API to check for anonymous caller instead of hardcoded string
    if caller_principal == Principal::anonymous() {
        return Ok(AuthResult {
            user_id: 0,
            role: UserRole::Guest,
            principal: caller_str,
            permissions: vec![],
        });
    }

    with_connection(|conn| {
        let now = now();

        // Check if user exists
        let existing: Option<(i64, String)> = conn
            .query_row(
                "SELECT id, role FROM users WHERE principal = ?1",
                (&caller_str,),
                |row| Ok((row.get(0)?, row.get(1)?))
            ).ok();

        let (user_id, role_name) = if let Some((id, role)) = existing {
            (id, role)
        } else {
            // First user becomes admin
            let admin_exists: i64 = conn
                .query_row("SELECT COUNT(*) FROM users WHERE role = 'admin'", [], |row| row.get(0))
                .unwrap_or(0);

            let role = if admin_exists == 0 { "admin" } else { "customer" };
            
            let id: i64 = conn.query_row(
                "INSERT INTO users (principal, role, created_at, updated_at) VALUES (?1, ?2, ?3, ?3) RETURNING id",
                (&caller_str, role, now),
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;

            // Assign role in role_users
            let role_id: i64 = conn.query_row(
                "SELECT id FROM roles WHERE name = ?1",
                (role,),
                |row| row.get(0)
            ).map_err(|_| format!("Role {} not found", role))?;

            conn.execute(
                "INSERT INTO role_users (role_id, user_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
                (role_id, id, now)
            ).map_err(|e| e.to_string())?;

            (id, role.to_string())
        };

        // Fetch all permissions for the user
        let mut stmt = conn.prepare(
            r#"SELECT DISTINCT ps.name 
               FROM permission_sets ps
               JOIN role_permission_sets rps ON rps.permission_set_id = ps.id
               JOIN role_users ru ON ru.role_id = rps.role_id
               WHERE ru.user_id = ?1"#
        ).map_err(|e| e.to_string())?;

        let permissions: Vec<String> = stmt.query_map((user_id,), |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

        let user_role = match role_name.as_str() {
            "admin" => UserRole::Admin,
            _ => UserRole::Customer
        };

        Ok(AuthResult {
            user_id,
            role: user_role,
            principal: caller_str,
            permissions,
        })
    })
}

#[ic_cdk::query]
fn get_user_role() -> UserRole {
    let caller_principal = ic_cdk::api::caller();
    if caller_principal == Principal::anonymous() { return UserRole::Guest; }
    let caller_str = caller_principal.to_string();

    with_connection(|conn| {
        conn.query_row(
            "SELECT role FROM users WHERE principal = ?1",
            (&caller_str,),
            |row| row.get::<_, String>(0)
        )
        .map(|r| match r.as_str() {
            "admin" => UserRole::Admin,
            _ => UserRole::Customer
        })
        .unwrap_or(UserRole::Guest)
    })
}

fn has_permission(permission: &str) -> bool {
    let caller_principal = ic_cdk::api::caller();
    if caller_principal == Principal::anonymous() { return false; }
    let caller_str = caller_principal.to_string();

    with_connection(|conn| {
        let count: i64 = conn.query_row(
            r#"SELECT COUNT(*) 
               FROM permission_sets ps
               JOIN role_permission_sets rps ON rps.permission_set_id = ps.id
               JOIN role_users ru ON ru.role_id = rps.role_id
               JOIN users u ON u.id = ru.user_id
               WHERE u.principal = ?1 AND (ps.name = ?2 OR ps.name = 'SuperUser')"#,
            (&caller_str, permission),
            |row| row.get(0)
        ).unwrap_or(0);
        count > 0
    })
}

fn is_admin() -> bool {
    has_permission("SuperUser")
}

fn get_current_user_id() -> Option<i64> {
    let caller_principal = ic_cdk::api::caller();
    if caller_principal == Principal::anonymous() { return None; }
    let caller_str = caller_principal.to_string();

    with_connection(|conn| {
        conn.query_row(
            "SELECT id FROM users WHERE principal = ?1",
            (&caller_str,),
            |row| row.get(0)
        ).ok()
    })
}

// ============================================
// PRODUCTS API
// ============================================

#[ic_cdk::query]
fn get_products(params: ProductQueryParams) -> Result<ProductListResponse, String> {
    // Check admin outside of connection to avoid nested borrow
    let is_admin_user = is_admin();
    let current_time = now();

    with_connection(|conn| {
        let mut conditions = vec!["p.deleted_at IS NULL".to_string()];
        let mut query_params: Vec<Box<dyn ic_rusqlite::ToSql>> = vec![];

        // Only show available products for non-admins
        if !is_admin_user {
            query_params.push(Box::new(current_time));
            conditions.push(format!("(p.available_on IS NULL OR p.available_on <= ?{})", query_params.len()));
            query_params.push(Box::new(current_time));
            conditions.push(format!("(p.discontinue_on IS NULL OR p.discontinue_on > ?{})", query_params.len()));
        }

        // In-stock filter
        if let Some(true) = params.in_stock {
            conditions.push("EXISTS (SELECT 1 FROM stock_items si2 JOIN variants v2 ON si2.variant_id = v2.id WHERE v2.product_id = p.id AND si2.count_on_hand > 0 AND si2.deleted_at IS NULL AND v2.deleted_at IS NULL)".to_string());
        }

        // Search (escape SQL LIKE wildcards to prevent query slowdown attacks)
        if let Some(ref q) = params.q {
            let param_num = query_params.len() + 1;
            conditions.push(format!("(p.name LIKE ?{} ESCAPE '\\' OR p.description LIKE ?{} ESCAPE '\\')", param_num, param_num));
            let escaped = q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
            query_params.push(Box::new(format!("%{}%", escaped)));
        }

        // Category filter
        if let Some(ref taxon_id) = params.taxon_id {
            let param_num = query_params.len() + 1;
            conditions.push(format!(
                "p.id IN (SELECT product_id FROM products_taxons WHERE taxon_id = ?{})",
                param_num
            ));
            query_params.push(Box::new(*taxon_id));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Count total
        let count_sql = format!("SELECT COUNT(DISTINCT p.id) FROM products p {}", where_clause);

        let param_refs: Vec<&dyn ic_rusqlite::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();
        let total_count: i64 = conn.query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))
            .map_err(|e| e.to_string())?;

        // Pagination
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).min(100);
        let offset = (page - 1) * per_page;

        // Sort
        let sort = match params.sort.as_deref() {
            Some("price_asc") => "pr.amount ASC",
            Some("price_desc") => "pr.amount DESC",
            Some("name_asc") => "p.name ASC",
            Some("name_desc") => "p.name DESC",
            _ => "p.created_at DESC",
        };

        let sql = format!(
            r#"
            SELECT DISTINCT
                p.id, p.name, p.slug, p.description, p.meta_title, p.meta_description,
                p.available_on, p.discontinue_on, p.promotionable, p.created_at, p.updated_at,
                v.id as variant_id, v.sku,
                pr.amount as price,
                COALESCE(si.count_on_hand, 0) as stock,
                (SELECT attachment_url FROM assets WHERE viewable_type = 'Variant' AND viewable_id = v.id LIMIT 1) as image_url
            FROM products p
            LEFT JOIN variants v ON v.product_id = p.id AND v.is_master = 1 AND v.deleted_at IS NULL
            LEFT JOIN prices pr ON pr.variant_id = v.id AND pr.deleted_at IS NULL
            LEFT JOIN stock_items si ON si.variant_id = v.id AND si.deleted_at IS NULL
            {}
            ORDER BY {}
            LIMIT ?{} OFFSET ?{}
            "#,
            where_clause,
            sort,
            query_params.len() + 1,
            query_params.len() + 2
        );

        query_params.push(Box::new(per_page));
        query_params.push(Box::new(offset));

        let param_refs: Vec<&dyn ic_rusqlite::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let products: Vec<ProductSummary> = stmt.query_map(param_refs.as_slice(), |row| {
            // Determine availability based on available_on and discontinue_on dates
            let available_on: Option<i64> = row.get(6)?;
            let discontinue_on: Option<i64> = row.get(7)?;
            let is_available = match (available_on, discontinue_on) {
                (Some(avail), Some(disc)) => current_time >= avail && current_time < disc,
                (Some(avail), None) => current_time >= avail,
                (None, Some(disc)) => current_time < disc,
                (None, None) => true,
            };

            // For non-admins, hide exact stock counts - only show 1 (in stock) or 0 (out of stock)
            let raw_stock: i64 = row.get::<_, i64>(14)?;
            let stock = if is_admin_user { raw_stock } else { if raw_stock > 0 { 1 } else { 0 } };

            Ok(ProductSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                description: row.get(3)?,
                price: row.get::<_, Option<i64>>(13)?.unwrap_or(0),
                stock,
                image_url: row.get(15)?,
                available: is_available,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        let total_pages = ((total_count as f64) / (per_page as f64)).ceil() as i64;

        Ok(ProductListResponse {
            products,
            total_count,
            page,
            per_page,
            total_pages,
        })
    })
}

#[ic_cdk::query]
fn get_product(slug_or_id: String) -> Result<ProductDetail, String> {
    // Check admin for stock visibility
    let is_admin_user = is_admin();

    with_connection(|conn| {
        // Try as ID first, then slug
        let product: (i64, String, String, Option<String>, Option<String>, Option<String>, Option<i64>, Option<i64>, i64, i64, i64) =
            if let Ok(id) = slug_or_id.parse::<i64>() {
                conn.query_row(
                    r#"SELECT id, name, slug, description, meta_title, meta_description,
                       available_on, discontinue_on, promotionable, created_at, updated_at
                       FROM products WHERE id = ?1 AND deleted_at IS NULL"#,
                    (id,),
                    |row| Ok((
                        row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
                        row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?, row.get(10)?
                    ))
                )
            } else {
                conn.query_row(
                    r#"SELECT id, name, slug, description, meta_title, meta_description,
                       available_on, discontinue_on, promotionable, created_at, updated_at
                       FROM products WHERE slug = ?1 AND deleted_at IS NULL"#,
                    (&slug_or_id,),
                    |row| Ok((
                        row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
                        row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?, row.get(10)?
                    ))
                )
            }.map_err(|_| "Product not found".to_string())?;

        let product_id = product.0;

        // Get variants with prices
        let mut variant_stmt = conn.prepare(
            r#"SELECT v.id, v.sku, v.is_master, v.position,
               pr.amount as price,
               COALESCE(si.count_on_hand, 0) as stock,
               si.backorderable
               FROM variants v
               LEFT JOIN prices pr ON pr.variant_id = v.id AND pr.deleted_at IS NULL
               LEFT JOIN stock_items si ON si.variant_id = v.id AND si.deleted_at IS NULL
               WHERE v.product_id = ?1 AND v.deleted_at IS NULL
               ORDER BY v.is_master DESC, v.position ASC"#
        ).map_err(|e| e.to_string())?;

        let mut variants: Vec<VariantDetail> = variant_stmt.query_map((product_id,), |row| {
            // For non-admins, hide exact stock counts - only show 1 (in stock) or 0 (out of stock)
            let raw_stock: i64 = row.get(5)?;
            let stock = if is_admin_user { raw_stock } else { if raw_stock > 0 { 1 } else { 0 } };

            Ok(VariantDetail {
                id: row.get(0)?,
                sku: row.get(1)?,
                is_master: row.get::<_, i64>(2)? == 1,
                position: row.get(3)?,
                price: row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                stock,
                backorderable: row.get::<_, Option<i64>>(6)?.unwrap_or(0) == 1,
                option_values: vec![], // Will populate below
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Populate option values for each variant
        for variant in &mut variants {
            let mut ov_stmt = conn.prepare(
                r#"SELECT ov.id, ov.name, ov.presentation, ot.name as option_type_name
                   FROM option_values ov
                   JOIN option_values_variants ovv ON ovv.option_value_id = ov.id
                   JOIN option_types ot ON ot.id = ov.option_type_id
                   WHERE ovv.variant_id = ?1
                   ORDER BY ot.position ASC"#
            ).map_err(|e| e.to_string())?;

            let options: Vec<OptionValueRef> = ov_stmt.query_map((variant.id,), |row| {
                Ok(OptionValueRef {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    presentation: row.get(2)?,
                    option_type_name: row.get(3)?,
                })
            }).map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

            variant.option_values = options;
        }

        // Get images
        let mut image_stmt = conn.prepare(
            r#"SELECT id, attachment_url, alt, position, viewable_id
               FROM assets
               WHERE viewable_type = 'Variant'
               AND viewable_id IN (SELECT id FROM variants WHERE product_id = ?1)
               ORDER BY position ASC"#
        ).map_err(|e| e.to_string())?;

        let images: Vec<ProductImage> = image_stmt.query_map((product_id,), |row| {
            Ok(ProductImage {
                id: row.get(0)?,
                url: row.get(1)?,
                alt: row.get(2)?,
                position: row.get(3)?,
                variant_id: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Get taxons (categories)
        let mut taxon_stmt = conn.prepare(
            r#"SELECT t.id, t.name, t.permalink
               FROM taxons t
               JOIN products_taxons pt ON pt.taxon_id = t.id
               WHERE pt.product_id = ?1
               ORDER BY pt.position ASC"#
        ).map_err(|e| e.to_string())?;

        let taxons: Vec<TaxonRef> = taxon_stmt.query_map((product_id,), |row| {
            Ok(TaxonRef {
                id: row.get(0)?,
                name: row.get(1)?,
                permalink: row.get(2)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Get properties
        let mut prop_stmt = conn.prepare(
            r#"SELECT pr.name, pr.presentation, pp.value
               FROM product_properties pp
               JOIN properties pr ON pr.id = pp.property_id
               WHERE pp.product_id = ?1
               ORDER BY pp.position ASC"#
        ).map_err(|e| e.to_string())?;

        let properties: Vec<ProductProperty> = prop_stmt.query_map((product_id,), |row| {
            Ok(ProductProperty {
                name: row.get(0)?,
                presentation: row.get(1)?,
                value: row.get(2)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Get master variant price
        let master_price: i64 = variants.iter()
            .find(|v| v.is_master)
            .map(|v| v.price)
            .unwrap_or(0);

        Ok(ProductDetail {
            id: product.0,
            name: product.1,
            slug: product.2,
            description: product.3,
            meta_title: product.4,
            meta_description: product.5,
            available_on: product.6,
            discontinue_on: product.7,
            promotionable: product.8 == 1,
            price: master_price,
            variants,
            images,
            taxons,
            properties,
            created_at: product.9,
            updated_at: product.10,
        })
    })
}

#[ic_cdk::update]
fn create_product(input: CreateProductInput) -> Result<i64, String> {
    // Check admin outside of connection to avoid nested borrow
    if !is_admin() { return Err("Admin only".to_string()); }

    // Validate price is non-negative
    if input.price < 0 {
        return Err("Price cannot be negative".to_string());
    }

    // Input validation and length limits
    if input.name.is_empty() {
        return Err("Product name is required".to_string());
    }
    if input.name.len() > 255 {
        return Err("Product name must be 255 characters or less".to_string());
    }
    if input.slug.len() > 255 {
        return Err("Product slug must be 255 characters or less".to_string());
    }
    if let Some(ref desc) = input.description {
        if desc.len() > 10000 {
            return Err("Description must be 10,000 characters or less".to_string());
        }
    }
    if let Some(ref sku) = input.sku {
        if sku.len() > 100 {
            return Err("SKU must be 100 characters or less".to_string());
        }
    }

    with_connection(|conn| {
        let now = now();

        // Create product
        let product_id: i64 = conn.query_row(
            r#"INSERT INTO products (name, slug, description, meta_title, meta_description,
               available_on, promotionable, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING id"#,
            (
                &input.name,
                &input.slug,
                &input.description,
                &input.meta_title,
                &input.meta_description,
                input.available_on,
                if input.promotionable.unwrap_or(true) { 1 } else { 0 },
                now
            ),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        // Create master variant
        let variant_id: i64 = conn.query_row(
            r#"INSERT INTO variants (product_id, sku, is_master, position, created_at, updated_at)
               VALUES (?1, ?2, 1, 0, ?3, ?3) RETURNING id"#,
            (product_id, &input.sku.unwrap_or_default(), now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        // Create price
        conn.execute(
            r#"INSERT INTO prices (variant_id, amount, currency, created_at, updated_at)
               VALUES (?1, ?2, 'USD', ?3, ?3)"#,
            (variant_id, input.price, now)
        ).map_err(|e| e.to_string())?;

        // Create stock item
        conn.execute(
            r#"INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at)
               VALUES (1, ?1, ?2, ?3, ?4, ?4)"#,
            (variant_id, input.stock.unwrap_or(0), if input.backorderable.unwrap_or(false) { 1 } else { 0 }, now)
        ).map_err(|e| e.to_string())?;

        // Add image if provided
        if let Some(image_url) = input.image_url {
            conn.execute(
                r#"INSERT INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
                   VALUES ('Variant', ?1, 0, ?2, ?3, 'Image', ?4, ?4)"#,
                (variant_id, &image_url, &input.name, now)
            ).map_err(|e| e.to_string())?;
        }

        // Associate with taxons
        if let Some(taxon_ids) = input.taxon_ids {
            for (pos, taxon_id) in taxon_ids.iter().enumerate() {
                conn.execute(
                    r#"INSERT INTO products_taxons (product_id, taxon_id, position, created_at, updated_at)
                       VALUES (?1, ?2, ?3, ?4, ?4)"#,
                    (product_id, taxon_id, pos as i64, now)
                ).map_err(|e| e.to_string())?;
            }
        }

        Ok(product_id)
    })
}

#[ic_cdk::update]
fn update_product(id: i64, input: UpdateProductInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Build update query dynamically
        let mut updates = vec!["updated_at = ?1".to_string()];
        let mut params: Vec<Box<dyn ic_rusqlite::ToSql>> = vec![Box::new(now)];

        if let Some(ref name) = input.name {
            params.push(Box::new(name.clone()));
            updates.push(format!("name = ?{}", params.len()));
        }
        if let Some(ref slug) = input.slug {
            params.push(Box::new(slug.clone()));
            updates.push(format!("slug = ?{}", params.len()));
        }
        if let Some(ref desc) = input.description {
            params.push(Box::new(desc.clone()));
            updates.push(format!("description = ?{}", params.len()));
        }
        if let Some(available_on) = input.available_on {
            params.push(Box::new(available_on));
            updates.push(format!("available_on = ?{}", params.len()));
        }
        if let Some(discontinue_on) = input.discontinue_on {
            params.push(Box::new(discontinue_on));
            updates.push(format!("discontinue_on = ?{}", params.len()));
        }

        params.push(Box::new(id));
        let sql = format!(
            "UPDATE products SET {} WHERE id = ?{}",
            updates.join(", "),
            params.len()
        );

        let param_refs: Vec<&dyn ic_rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

        // Update price if provided
        if let Some(price) = input.price {
            // Validate price is non-negative
            if price < 0 {
                return Err("Price cannot be negative".to_string());
            }
            // Get master variant ID
            let variant_id: i64 = conn.query_row(
                "SELECT id FROM variants WHERE product_id = ?1 AND is_master = 1",
                (id,),
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE prices SET amount = ?1, updated_at = ?2 WHERE variant_id = ?3",
                (price, now, variant_id)
            ).map_err(|e| e.to_string())?;
        }

        // Update stock if provided
        if let Some(stock) = input.stock {
            let variant_id: i64 = conn.query_row(
                "SELECT id FROM variants WHERE product_id = ?1 AND is_master = 1",
                (id,),
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE stock_items SET count_on_hand = ?1, updated_at = ?2 WHERE variant_id = ?3",
                (stock, now, variant_id)
            ).map_err(|e| e.to_string())?;
        }

        // Update taxons if provided
        if let Some(taxon_ids) = input.taxon_ids {
            // Remove existing
            conn.execute("DELETE FROM products_taxons WHERE product_id = ?1", (id,))
                .map_err(|e| e.to_string())?;

            // Add new
            for (pos, taxon_id) in taxon_ids.iter().enumerate() {
                conn.execute(
                    r#"INSERT INTO products_taxons (product_id, taxon_id, position, created_at, updated_at)
                       VALUES (?1, ?2, ?3, ?4, ?4)"#,
                    (id, taxon_id, pos as i64, now)
                ).map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    })
}

#[ic_cdk::update]
fn delete_product(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        conn.execute(
            "UPDATE products SET deleted_at = ?1 WHERE id = ?2",
            (now, id)
        ).map_err(|e| e.to_string())?;
        Ok(())
    })
}

// ============================================
// PRODUCT IMAGES API
// ============================================

#[ic_cdk::update]
fn add_product_image(product_id: i64, url: String, alt: Option<String>) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Get the master variant for this product
        let variant_id: i64 = conn.query_row(
            "SELECT id FROM variants WHERE product_id = ?1 AND is_master = 1 LIMIT 1",
            (product_id,),
            |row| row.get(0)
        ).map_err(|_| "Product not found or has no master variant".to_string())?;

        // Get the next position
        let max_position: i64 = conn.query_row(
            "SELECT COALESCE(MAX(position), -1) FROM assets WHERE viewable_type = 'Variant' AND viewable_id = ?1",
            (variant_id,),
            |row| row.get(0)
        ).unwrap_or(-1);

        let image_id: i64 = conn.query_row(
            r#"INSERT INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
               VALUES ('Variant', ?1, ?2, ?3, ?4, 'Image', ?5, ?5) RETURNING id"#,
            (variant_id, max_position + 1, &url, &alt, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        Ok(image_id)
    })
}

#[ic_cdk::update]
fn delete_product_image(image_id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        conn.execute(
            "DELETE FROM assets WHERE id = ?1",
            (image_id,)
        ).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[ic_cdk::update]
fn reorder_product_images(product_id: i64, image_ids: Vec<i64>) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Get the master variant for this product
        let variant_id: i64 = conn.query_row(
            "SELECT id FROM variants WHERE product_id = ?1 AND is_master = 1 LIMIT 1",
            (product_id,),
            |row| row.get(0)
        ).map_err(|_| "Product not found".to_string())?;

        // Update positions for each image
        for (pos, image_id) in image_ids.iter().enumerate() {
            conn.execute(
                "UPDATE assets SET position = ?1, updated_at = ?2 WHERE id = ?3 AND viewable_id = ?4",
                (pos as i64, now, image_id, variant_id)
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    })
}

// ============================================
// CATEGORIES (TAXONS) API
// ============================================

#[ic_cdk::query]
fn get_taxonomies() -> Result<Vec<TaxonomyWithTaxons>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, position FROM taxonomies ORDER BY position ASC"
        ).map_err(|e| e.to_string())?;

        let taxonomies: Vec<(i64, String, i64)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        let mut result = vec![];
        for (id, name, position) in taxonomies {
            let mut taxon_stmt = conn.prepare(
                r#"SELECT id, name, permalink, parent_id, position, depth,
                   (SELECT COUNT(*) FROM products_taxons WHERE taxon_id = taxons.id) as product_count
                   FROM taxons WHERE taxonomy_id = ?1
                   ORDER BY lft ASC, position ASC"#
            ).map_err(|e| e.to_string())?;

            let taxons: Vec<TaxonDetail> = taxon_stmt.query_map((id,), |row| {
                Ok(TaxonDetail {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    permalink: row.get(2)?,
                    parent_id: row.get(3)?,
                    position: row.get(4)?,
                    depth: row.get(5)?,
                    product_count: row.get(6)?,
                })
            }).map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

            result.push(TaxonomyWithTaxons { id, name, position, taxons });
        }

        Ok(result)
    })
}

#[ic_cdk::update]
fn admin_create_taxonomy(input: CreateTaxonomyInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        let taxonomy_id: i64 = conn.query_row(
            "INSERT INTO taxonomies (name, position, created_at, updated_at) VALUES (?1, COALESCE((SELECT MAX(position)+1 FROM taxonomies), 0), ?2, ?2) RETURNING id",
            (&input.name, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        // Create root taxon
        conn.execute(
            "INSERT INTO taxons (taxonomy_id, name, permalink, position, depth, created_at, updated_at) VALUES (?1, ?2, ?3, 0, 0, ?4, ?4)",
            (taxonomy_id, &input.name, &input.name.to_lowercase(), now)
        ).map_err(|e| e.to_string())?;

        Ok(taxonomy_id)
    })
}

#[ic_cdk::update]
fn admin_update_taxonomy(id: i64, name: String) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        conn.execute(
            "UPDATE taxonomies SET name = ?1, updated_at = ?2 WHERE id = ?3",
            (name, now, id)
        ).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[ic_cdk::update]
fn admin_delete_taxonomy(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        conn.execute("DELETE FROM taxons WHERE taxonomy_id = ?1", (id,))
            .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM taxonomies WHERE id = ?1", (id,))
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[ic_cdk::update]
fn admin_create_taxon(input: CreateTaxonInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        
        let depth: i64 = if let Some(parent_id) = input.parent_id {
            conn.query_row("SELECT depth + 1 FROM taxons WHERE id = ?1", (parent_id,), |row| row.get(0))
                .unwrap_or(0)
        } else {
            0
        };

        let permalink = if let Some(parent_id) = input.parent_id {
            let parent_permalink: String = conn.query_row("SELECT permalink FROM taxons WHERE id = ?1", (parent_id,), |row| row.get(0))
                .unwrap_or_default();
            format!("{}/{}", parent_permalink, input.name.to_lowercase())
        } else {
            input.name.to_lowercase()
        };

        let taxon_id: i64 = conn.query_row(
            r#"INSERT INTO taxons (taxonomy_id, parent_id, name, permalink, position, depth, description, created_at, updated_at) 
               VALUES (?1, ?2, ?3, ?4, COALESCE((SELECT MAX(position)+1 FROM taxons WHERE parent_id IS ?2), 0), ?5, ?6, ?7, ?7) RETURNING id"#,
            (input.taxonomy_id, input.parent_id, &input.name, permalink, depth, &input.description, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        Ok(taxon_id)
    })
}

#[ic_cdk::update]
fn admin_update_taxon(id: i64, input: UpdateTaxonInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        
        if let Some(name) = input.name {
            conn.execute("UPDATE taxons SET name = ?1, updated_at = ?2 WHERE id = ?3", (&name, now, id))
                .map_err(|e| e.to_string())?;
        }

        if let Some(description) = input.description {
            conn.execute("UPDATE taxons SET description = ?1, updated_at = ?2 WHERE id = ?3", (&description, now, id))
                .map_err(|e| e.to_string())?;
        }

        if let Some(parent_id) = input.parent_id {
             let depth: i64 = conn.query_row("SELECT depth + 1 FROM taxons WHERE id = ?1", (parent_id,), |row| row.get(0))
                .unwrap_or(0);
            conn.execute("UPDATE taxons SET parent_id = ?1, depth = ?2, updated_at = ?3 WHERE id = ?4", (parent_id, depth, now, id))
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    })
}

#[ic_cdk::update]
fn admin_delete_taxon(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        // Delete child taxons recursively 
        conn.execute("DELETE FROM taxons WHERE id = ?1 OR parent_id = ?1", (id,))
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

// ============================================
// CART API
// ============================================

#[ic_cdk::query]
fn get_cart(session_id: Option<String>) -> Result<Option<OrderDetail>, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();

    with_connection(|conn| {
        if is_anonymous {
            if let Some(sess_id) = session_id {
                // Find guest cart by token
                 conn.query_row(
                    "SELECT id FROM orders WHERE guest_token = ?1 AND state = 'cart'",
                    (sess_id,),
                    |row| row.get(0)
                ).ok()
                 .map(|id| get_order_detail(&conn, id))
                 .transpose()
            } else {
                Ok(None)
            }
        } else {
             // Find active cart for user
            get_order_by_state(&conn, &caller_str, "cart")
        }
    })
}

#[ic_cdk::update]
fn add_to_cart(variant_id: i64, quantity: i64, session_id: Option<String>) -> Result<OrderDetail, String> {
    // Validate quantity limits to prevent abuse
    if quantity <= 0 {
        return Err("Quantity must be positive".to_string());
    }
    const MAX_QUANTITY_PER_ITEM: i64 = 999;
    if quantity > MAX_QUANTITY_PER_ITEM {
        return Err(format!("Maximum quantity per item is {}", MAX_QUANTITY_PER_ITEM));
    }

    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();

    // Get user_id outside of connection to avoid nested borrow
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    if is_anonymous && session_id.is_none() {
        return Err("Session ID required for guest checkout".to_string());
    }

    with_connection(|conn| {
        let now = now();

        // Get or create cart
        let order_id: i64 = if is_anonymous {
             let sess_id = session_id.as_ref().ok_or("Session ID missing")?;
             match conn.query_row(
                "SELECT id FROM orders WHERE guest_token = ?1 AND state = 'cart'",
                (&sess_id,),
                |row| row.get(0)
            ) {
                Ok(id) => id,
                Err(_) => {
                    let number = generate_order_number();
                    conn.query_row(
                        r#"INSERT INTO orders (number, user_principal, guest_token, state, created_at, updated_at) 
                           VALUES (?1, 'anonymous', ?2, 'cart', ?3, ?3) RETURNING id"#,
                        (&number, &sess_id, now),
                        |row| row.get(0)
                    ).map_err(|e| e.to_string())?
                }
            }
        } else {
            match conn.query_row(
                "SELECT id FROM orders WHERE (user_id = ?1 OR user_principal = ?2) AND state = 'cart'",
                (user_id, &caller_str),
                |row| row.get(0)
            ) {
                Ok(id) => id,
                Err(_) => {
                    let number = generate_order_number();
                    conn.query_row(
                        r#"INSERT INTO orders (number, user_id, user_principal, state, created_at, updated_at)
                           VALUES (?1, ?2, ?3, 'cart', ?4, ?4) RETURNING id"#,
                        (&number, user_id, &caller_str, now),
                        |row| row.get(0)
                    ).map_err(|e| e.to_string())?
                }
            }
        };

        // Get variant price
        let (price, currency): (i64, String) = conn.query_row(
            r#"SELECT pr.amount, pr.currency FROM prices pr
               JOIN variants v ON v.id = pr.variant_id
               WHERE pr.variant_id = ?1 AND pr.deleted_at IS NULL AND v.deleted_at IS NULL"#,
            (variant_id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "Variant not found or has no price".to_string())?;

        // Check stock
        let stock: i64 = conn.query_row(
            "SELECT COALESCE(count_on_hand, 0) FROM stock_items WHERE variant_id = ?1 AND deleted_at IS NULL",
            (variant_id,),
            |row| row.get(0)
        ).unwrap_or(0);

        if stock < quantity {
            return Err(format!("Insufficient stock. Available: {}", stock));
        }

        // Check if line item exists
        let existing_line_item: Option<(i64, i64)> = conn.query_row(
            "SELECT id, quantity FROM line_items WHERE order_id = ?1 AND variant_id = ?2",
            (order_id, variant_id),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).ok();

        if let Some((line_item_id, existing_qty)) = existing_line_item {
            // Update quantity
            let new_qty = existing_qty + quantity;
            if stock < new_qty {
                return Err(format!("Insufficient stock. Available: {}", stock));
            }
            conn.execute(
                "UPDATE line_items SET quantity = ?1, updated_at = ?2 WHERE id = ?3",
                (new_qty, now, line_item_id)
            ).map_err(|e| e.to_string())?;
        } else {
            // Create new line item
            conn.execute(
                r#"INSERT INTO line_items (order_id, variant_id, quantity, price, currency, created_at, updated_at)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)"#,
                (order_id, variant_id, quantity, price, &currency, now)
            ).map_err(|e| e.to_string())?;
        }

        // Recalculate order totals
        recalculate_order(&conn, order_id)?;

        // Return updated cart
        get_order_detail(&conn, order_id)
    })
}

#[ic_cdk::update]
fn update_line_item(line_item_id: i64, quantity: i64, session_id: Option<String>) -> Result<OrderDetail, String> {
    // Validate quantity limits to prevent abuse
    if quantity < 0 {
        return Err("Quantity cannot be negative".to_string());
    }
    const MAX_QUANTITY_PER_ITEM: i64 = 999;
    if quantity > MAX_QUANTITY_PER_ITEM {
        return Err(format!("Maximum quantity per item is {}", MAX_QUANTITY_PER_ITEM));
    }

    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();

    if is_anonymous && session_id.is_none() {
        return Err("Session ID required for guest checkout".to_string());
    }

    with_connection(|conn| {
        let now = now();

        // Verify ownership and get details
        let (order_id, variant_id, order_guest_token, _order_user_principal): (i64, i64, Option<String>, String) = conn.query_row(
            r#"SELECT li.order_id, li.variant_id, o.guest_token, o.user_principal
               FROM line_items li
               JOIN orders o ON o.id = li.order_id
               WHERE li.id = ?1"#,
            (line_item_id,),
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        ).map_err(|_| "Line item not found".to_string())?;

        // Check permissions
        if is_anonymous {
             let sess_id = session_id.as_ref().ok_or("Session ID required")?;
             if order_guest_token.as_ref() != Some(sess_id) {
                 return Err("Unauthorized".to_string());
             }
        } else {
            // Check if user owns order via:
            // 1. user_principal match
            // 2. user_id match (via users table principal lookup)
            // 3. guest_token match if session_id provided (for carts created before login)
            let mut is_owner: bool = conn.query_row(
                "SELECT COUNT(*) FROM orders WHERE id = ?1 AND (user_principal = ?2 OR user_id IN (SELECT id FROM users WHERE principal = ?2))",
                (order_id, &caller_str),
                |row| row.get::<_, i64>(0)
            ).unwrap_or(0) > 0;

            // Also allow if session_id matches the guest_token (cart created before login)
            if !is_owner {
                if let Some(sess_id) = session_id.as_ref() {
                    is_owner = order_guest_token.as_ref() == Some(sess_id);
                }
            }

            if !is_owner { return Err("Unauthorized".to_string()); }
        }

        if quantity <= 0 {
            // Remove line item
            conn.execute("DELETE FROM line_items WHERE id = ?1", (line_item_id,))
                .map_err(|e| e.to_string())?;
        } else {
            // Check stock
            let stock: i64 = conn.query_row(
                "SELECT COALESCE(count_on_hand, 0) FROM stock_items WHERE variant_id = ?1",
                (variant_id,),
                |row| row.get(0)
            ).unwrap_or(0);

            if stock < quantity {
                return Err(format!("Insufficient stock. Available: {}", stock));
            }

            conn.execute(
                "UPDATE line_items SET quantity = ?1, updated_at = ?2 WHERE id = ?3",
                (quantity, now, line_item_id)
            ).map_err(|e| e.to_string())?;
        }

        recalculate_order(&conn, order_id)?;
        get_order_detail(&conn, order_id)
    })
}

#[ic_cdk::update]
fn remove_from_cart(line_item_id: i64, session_id: Option<String>) -> Result<OrderDetail, String> {
    update_line_item(line_item_id, 0, session_id)
}

#[ic_cdk::update]
fn apply_coupon(input: ApplyCouponInput, session_id: Option<String>) -> Result<OrderDetail, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    if is_anonymous && session_id.is_none() {
        return Err("Session ID required".to_string());
    }

    with_connection(|conn| {
        let now = now();

        // Get active cart
        let order_id: i64 = if is_anonymous {
            let sess_id = session_id.as_ref().ok_or("Session ID required")?;
            conn.query_row(
                "SELECT id FROM orders WHERE guest_token = ?1 AND state = 'cart'",
                (&sess_id,),
                |row| row.get(0)
            )
        } else {
            conn.query_row(
                "SELECT id FROM orders WHERE (user_id = ?1 OR user_principal = ?2) AND state = 'cart'",
                (user_id, &caller_str),
                |row| row.get(0)
            )
        }.map_err(|_| "No active cart found".to_string())?;

        // Find promotion by code
        let promotion: (i64, String, Option<i64>, Option<i64>, Option<i64>, i64) = match conn.query_row(
            r#"SELECT p.id, p.name, p.starts_at, p.expires_at, p.usage_limit,
               (SELECT COUNT(*) FROM adjustments WHERE source_type = 'Promotion' AND source_id = p.id) as usage_count
               FROM promotions p
               JOIN promotion_codes pc ON pc.promotion_id = p.id
               WHERE pc.value = ?1 AND p.active = 1"#,
            (&input.code,),
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
        ) {
            Ok(p) => p,
            Err(_) => return Err("Invalid or inactive promotion code".to_string()),
        };

        let (promo_id, promo_name, starts_at, expires_at, usage_limit, usage_count) = promotion;

        // Validate dates
        if let Some(start) = starts_at {
            if now < start { return Err("Promotion has not started yet".to_string()); }
        }
        if let Some(end) = expires_at {
            if now > end { return Err("Promotion has expired".to_string()); }
        }

        // Validate usage limit
        if let Some(limit) = usage_limit {
            if usage_count >= limit { return Err("Promotion usage limit reached".to_string()); }
        }

        // Check if already applied
        let already_applied: i64 = conn.query_row(
            "SELECT COUNT(*) FROM adjustments WHERE order_id = ?1 AND source_type = 'Promotion' AND source_id = ?2",
            (order_id, promo_id),
            |row| row.get(0)
        ).unwrap_or(0);

        if already_applied > 0 {
            return Err("Promotion already applied to this order".to_string());
        }

        // Evaluate rules
        let rules_met = evaluate_promotion_rules(&conn, promo_id, order_id)?;
        if !rules_met {
            return Err("Order does not meet the requirements for this promotion".to_string());
        }

        // Apply actions
        apply_promotion_actions(&conn, promo_id, order_id, &promo_name)?;

        recalculate_order(&conn, order_id)?;
        get_order_detail(&conn, order_id)
    })
}

fn evaluate_promotion_rules(conn: &Connection, promo_id: i64, order_id: i64) -> Result<bool, String> {
    let mut stmt = conn.prepare(
        "SELECT rule_type, preferences FROM promotion_rules WHERE promotion_id = ?1"
    ).map_err(|e| e.to_string())?;

    let rules = stmt.query_map((promo_id,), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for rule in rules {
        let (rule_type, prefs_json) = rule.map_err(|e| e.to_string())?;
        let prefs: serde_json::Value = serde_json::from_str(&prefs_json).map_err(|e| e.to_string())?;

        match rule_type.as_str() {
            "ItemTotal" => {
                let threshold = prefs["amount"].as_i64().unwrap_or(0);
                let item_total: i64 = conn.query_row(
                    "SELECT item_total FROM orders WHERE id = ?1",
                    (order_id,),
                    |row| row.get(0)
                ).unwrap_or(0);
                if item_total < threshold { return Ok(false); }
            },
            "FirstOrder" => {
                let user_id: Option<i64> = conn.query_row(
                    "SELECT user_id FROM orders WHERE id = ?1",
                    (order_id,),
                    |row| row.get(0)
                ).ok().flatten();

                if let Some(uid) = user_id {
                    let order_count: i64 = conn.query_row(
                        "SELECT COUNT(*) FROM orders WHERE user_id = ?1 AND state = 'complete'",
                        (uid,),
                        |row| row.get(0)
                    ).unwrap_or(0);
                    if order_count > 0 { return Ok(false); }
                } else {
                    // Guests don't qualify for first order promotions? 
                    // Solidus usually requires a user or tracks by email.
                    return Ok(false);
                }
            },
            unknown => {
                // Reject unknown rule types to prevent unintended discounts
                return Err(format!("Unknown promotion rule type: '{}'", unknown));
            }
        }
    }

    Ok(true)
}

fn apply_promotion_actions(conn: &Connection, promo_id: i64, order_id: i64, promo_name: &str) -> Result<(), String> {
    let mut stmt = conn.prepare(
        "SELECT id, action_type, calculator_type, preferences FROM promotion_actions WHERE promotion_id = ?1"
    ).map_err(|e| e.to_string())?;

    let actions = stmt.query_map((promo_id,), |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?))
    }).map_err(|e| e.to_string())?;

    let now = now();

    for action in actions {
        let (_action_id, action_type, calc_type, prefs_json) = action.map_err(|e| e.to_string())?;
        let prefs: serde_json::Value = serde_json::from_str(&prefs_json).map_err(|e| e.to_string())?;

        if action_type == "CreateAdjustment" {
            let amount: i64 = if calc_type == "FlatRate" {
                -prefs["amount"].as_i64().unwrap_or(0)
            } else if calc_type == "PercentOff" {
                let percent = prefs["percent"].as_i64().unwrap_or(0);
                let item_total: i64 = conn.query_row(
                    "SELECT item_total FROM orders WHERE id = ?1",
                    (order_id,),
                    |row| row.get(0)
                ).unwrap_or(0);
                -(item_total * percent / 100)
            } else {
                // Reject unknown calculator types
                return Err(format!("Unknown promotion calculator type: '{}'", calc_type));
            };

            if amount != 0 {
                conn.execute(
                    r#"INSERT INTO adjustments (source_type, source_id, adjustable_type, adjustable_id, order_id, amount, label, created_at, updated_at)
                       VALUES ('Promotion', ?1, 'Order', ?2, ?2, ?3, ?4, ?5, ?5)"#,
                    (promo_id, order_id, amount, promo_name, now)
                ).map_err(|e| e.to_string())?;
            }
        } else {
            // Reject unknown action types
            return Err(format!("Unknown promotion action type: '{}'", action_type));
        }
    }

    Ok(())
}

#[ic_cdk::query]
fn admin_get_promotions() -> Result<Vec<Promotion>, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT id, name, description, usage_limit, active, starts_at, expires_at FROM promotions ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        
        let promos = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            
            // Get usage count
            let usage_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM adjustments WHERE source_type = 'Promotion' AND source_id = ?1",
                (id,),
                |row| row.get(0)
            ).unwrap_or(0);

            // Get code (simplified, just first code if multiple exist)
            let code: Option<String> = conn.query_row(
                "SELECT value FROM promotion_codes WHERE promotion_id = ?1 LIMIT 1",
                (id,),
                |row| row.get(0)
            ).ok();

            Ok(Promotion {
                id,
                name: row.get(1)?,
                description: row.get(2)?,
                code,
                starts_at: row.get(5)?,
                expires_at: row.get(6)?,
                usage_limit: row.get(3)?,
                usage_count,
                active: row.get::<_, i64>(4)? == 1,
                rules: vec![], // don't load all rules for list
                actions: vec![], // don't load all actions for list
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(promos)
    })
}

#[ic_cdk::update]
fn admin_create_promotion(input: CreatePromotionInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        let id: i64 = conn.query_row(
            r#"INSERT INTO promotions (name, description, active, usage_limit, starts_at, expires_at, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7) RETURNING id"#,
            (&input.name, &input.description, if input.active.unwrap_or(true) { 1 } else { 0 }, &input.usage_limit, &input.starts_at, &input.expires_at, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        if let Some(code) = input.code {
            conn.execute(
                "INSERT INTO promotion_codes (promotion_id, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
                (id, &code, now)
            ).map_err(|e| e.to_string())?;
        }

        Ok(id)
    })
}

#[ic_cdk::update]
fn admin_update_promotion(id: i64, input: UpdatePromotionInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        if let Some(name) = input.name {
            conn.execute("UPDATE promotions SET name = ?1, updated_at = ?2 WHERE id = ?3", (name, now, id)).ok();
        }
        if let Some(active) = input.active {
            conn.execute("UPDATE promotions SET active = ?1, updated_at = ?2 WHERE id = ?3", (if active { 1 } else { 0 }, now, id)).ok();
        }
        Ok(())
    })
}

#[ic_cdk::update]
fn admin_add_promotion_rule(input: AddPromotionRuleInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        let id: i64 = conn.query_row(
            "INSERT INTO promotion_rules (promotion_id, rule_type, preferences, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
            (input.promotion_id, &input.rule_type, &input.preferences, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        Ok(id)
    })
}

#[ic_cdk::update]
fn admin_add_promotion_action(input: AddPromotionActionInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        let id: i64 = conn.query_row(
            "INSERT INTO promotion_actions (promotion_id, action_type, calculator_type, preferences, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5) RETURNING id",
            (input.promotion_id, &input.action_type, &input.calculator_type, &input.preferences, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        Ok(id)
    })
}

// ============================================
// CHECKOUT API
// ============================================

// Helper to validate address field lengths
fn validate_address(addr: &AddressInput, label: &str) -> Result<(), String> {
    const MAX_NAME_LEN: usize = 100;
    const MAX_ADDRESS_LEN: usize = 255;
    const MAX_CITY_LEN: usize = 100;
    const MAX_STATE_LEN: usize = 100;
    const MAX_ZIP_LEN: usize = 20;
    const MAX_PHONE_LEN: usize = 30;

    if addr.firstname.len() > MAX_NAME_LEN {
        return Err(format!("{} first name too long (max {} chars)", label, MAX_NAME_LEN));
    }
    if addr.lastname.len() > MAX_NAME_LEN {
        return Err(format!("{} last name too long (max {} chars)", label, MAX_NAME_LEN));
    }
    if addr.address1.len() > MAX_ADDRESS_LEN {
        return Err(format!("{} address1 too long (max {} chars)", label, MAX_ADDRESS_LEN));
    }
    if let Some(ref a2) = addr.address2 {
        if a2.len() > MAX_ADDRESS_LEN { return Err(format!("{} address2 too long (max {} chars)", label, MAX_ADDRESS_LEN)); }
    }
    if addr.city.len() > MAX_CITY_LEN {
        return Err(format!("{} city too long (max {} chars)", label, MAX_CITY_LEN));
    }
    if let Some(ref s) = addr.state_name {
        if s.len() > MAX_STATE_LEN { return Err(format!("{} state too long (max {} chars)", label, MAX_STATE_LEN)); }
    }
    if addr.zipcode.len() > MAX_ZIP_LEN {
        return Err(format!("{} zipcode too long (max {} chars)", label, MAX_ZIP_LEN));
    }
    if let Some(ref p) = addr.phone {
        if p.len() > MAX_PHONE_LEN { return Err(format!("{} phone too long (max {} chars)", label, MAX_PHONE_LEN)); }
    }
    Ok(())
}

#[ic_cdk::update]
fn set_order_address(input: SetAddressInput, session_id: Option<String>) -> Result<OrderDetail, String> {
    // Validate email
    if input.email.len() > 254 {
        return Err("Email address too long (max 254 chars)".to_string());
    }
    // Validate address fields
    validate_address(&input.shipping, "Shipping")?;
    if let Some(ref billing) = input.billing {
        validate_address(billing, "Billing")?;
    }

    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    with_connection(|conn| {
        let now = now();

        // Get cart order
        let order_id: i64 = if is_anonymous {
             if let Some(sess_id) = session_id {
                 conn.query_row(
                    "SELECT id FROM orders WHERE guest_token = ?1 AND state IN ('cart', 'address')",
                    (&sess_id,),
                    |row| row.get(0)
                ).map_err(|_| "No active cart found".to_string())?
             } else {
                 return Err("Session ID required for guest checkout".to_string());
             }
        } else {
            conn.query_row(
                "SELECT id FROM orders WHERE (user_id = ?1 OR user_principal = ?2) AND state IN ('cart', 'address')",
                (user_id, &caller_str),
                |row| row.get(0)
            ).map_err(|_| "No active cart found".to_string())?
        };

        // Create or update shipping address
        let ship_address_id: i64 = conn.query_row(
            r#"INSERT INTO addresses (user_id, firstname, lastname, address1, address2, city, state_name, zipcode, country_code, phone, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11) RETURNING id"#,
            (
                user_id,
                &input.shipping.firstname,
                &input.shipping.lastname,
                &input.shipping.address1,
                &input.shipping.address2,
                &input.shipping.city,
                &input.shipping.state_name,
                &input.shipping.zipcode,
                &input.shipping.country_code.as_deref().unwrap_or("US"),
                &input.shipping.phone,
                now
            ),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        // Use same for billing or create separate
        let bill_address_id = if input.use_shipping_for_billing.unwrap_or(true) {
            ship_address_id
        } else if let Some(billing) = input.billing {
            conn.query_row(
                r#"INSERT INTO addresses (user_id, firstname, lastname, address1, address2, city, state_name, zipcode, country_code, phone, created_at, updated_at)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11) RETURNING id"#,
                (
                    user_id,
                    &billing.firstname,
                    &billing.lastname,
                    &billing.address1,
                    &billing.address2,
                    &billing.city,
                    &billing.state_name,
                    &billing.zipcode,
                    &billing.country_code.as_deref().unwrap_or("US"),
                    &billing.phone,
                    now
                ),
                |row| row.get(0)
            ).map_err(|e| e.to_string())?
        } else {
            ship_address_id
        };

        // Update order with email and addresses
        conn.execute(
            r#"UPDATE orders SET
               email = ?1, ship_address_id = ?2, bill_address_id = ?3,
               state = 'address', updated_at = ?4
               WHERE id = ?5"#,
            (&input.email, ship_address_id, bill_address_id, now, order_id)
        ).map_err(|e| e.to_string())?;

        // Calculate taxes
        calculate_taxes(&conn, order_id)?;

        recalculate_order(&conn, order_id)?;
        get_order_detail(&conn, order_id)
    })
}

fn calculate_taxes(conn: &Connection, order_id: i64) -> Result<(), String> {
    let now = now();

    // Clear existing tax adjustments
    conn.execute(
        "DELETE FROM adjustments WHERE order_id = ?1 AND source_type = 'TaxRate'",
        (order_id,)
    ).map_err(|e| e.to_string())?;

    // Get order shipping address country/state
    let address: (String, Option<String>) = match conn.query_row(
        r#"SELECT country_code, state_name FROM addresses
           WHERE id = (SELECT ship_address_id FROM orders WHERE id = ?1)"#,
        (order_id,),
        |row| Ok((row.get(0)?, row.get(1)?))
    ) {
        Ok(a) => a,
        Err(_) => return Ok(()), // No address, no tax
    };

    let (country_code, state_name) = address;

    // Find applicable tax rates
    // This is a simplified version of Solidus zone matching
    let mut stmt = conn.prepare(
        r#"SELECT tr.id, tr.amount, tr.name, tr.included_in_price
           FROM tax_rates tr
           JOIN zones z ON z.id = tr.zone_id
           JOIN zone_members zm ON zm.zone_id = z.id
           WHERE tr.deleted_at IS NULL
           AND (
               (zm.zoneable_type = 'Country' AND zm.zoneable_id = ?1)
               OR (zm.zoneable_type = 'State' AND zm.zoneable_id = ?2)
           )"#
    ).map_err(|e| e.to_string())?;

    let tax_rates = stmt.query_map((&country_code, &state_name), |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?, row.get::<_, Option<String>>(2)?, row.get::<_, i64>(3)? == 1))
    }).map_err(|e| e.to_string())?;

    // For each line item, apply applicable tax rates
    // Simplified: apply all matching rates to all line items
    let mut line_items_stmt = conn.prepare(
        "SELECT id, price, quantity FROM line_items WHERE order_id = ?1"
    ).map_err(|e| e.to_string())?;

    let line_items: Vec<(i64, i64, i64)> = line_items_stmt.query_map((order_id,), |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    for tax_rate in tax_rates {
        let (rate_id, amount_rate, name, included) = tax_rate.map_err(|e| e.to_string())?;
        let label = name.unwrap_or_else(|| format!("Tax ({:.1}%)", amount_rate * 100.0));

        for (line_item_id, price, quantity) in &line_items {
            let tax_amount = if included {
                // price = total / (1 + rate)
                // tax = total - (total / (1 + rate))
                let total = price * quantity;
                total - (total as f64 / (1.0 + amount_rate)).round() as i64
            } else {
                ((price * quantity) as f64 * amount_rate).round() as i64
            };

            if tax_amount != 0 {
                conn.execute(
                    r#"INSERT INTO adjustments (source_type, source_id, adjustable_type, adjustable_id, order_id, amount, label, included, created_at, updated_at)
                       VALUES ('TaxRate', ?1, 'LineItem', ?2, ?3, ?4, ?5, ?6, ?7, ?7)"#,
                    (rate_id, line_item_id, order_id, tax_amount, &label, if included { 1 } else { 0 }, now)
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

fn calculate_shipping_cost(conn: &Connection, shipping_method_id: i64, order_id: i64) -> Result<i64, String> {
    // Basic calculation: base price from method + weight-based cost
    let base_cost: i64 = match conn.query_row(
        "SELECT base_cost FROM shipping_methods WHERE id = ?1",
        (shipping_method_id,),
        |row| row.get(0)
    ) {
        Ok(c) => c,
        Err(_) => return Err("Shipping method not found".to_string()),
    };

    let total_weight: f64 = conn.query_row(
        r#"SELECT COALESCE(SUM(v.weight * li.quantity), 0.0)
           FROM line_items li
           JOIN variants v ON v.id = li.variant_id
           WHERE li.order_id = ?1"#,
        (order_id,),
        |row| row.get(0)
    ).unwrap_or(0.0);

    // Add $1 per unit of weight (simplified)
    let weight_cost = (total_weight * 100.0) as i64;
    
    Ok(base_cost + weight_cost)
}

fn move_stock(conn: &Connection, variant_id: i64, stock_location_id: i64, quantity: i64, action: &str, originator_type: &str, originator_id: i64) -> Result<(), String> {
    let now = now();

    // Find stock item for the given location
    let stock_item_id: i64 = match conn.query_row(
        "SELECT id FROM stock_items WHERE variant_id = ?1 AND stock_location_id = ?2",
        (variant_id, stock_location_id),
        |row| row.get(0)
    ) {
        Ok(id) => id,
        Err(_) => {
            // Create stock item if it doesn't exist
            conn.query_row(
                "INSERT INTO stock_items (variant_id, stock_location_id, count_on_hand, backorderable, created_at, updated_at) VALUES (?1, ?2, 0, 1, ?3, ?3) RETURNING id",
                (variant_id, stock_location_id, now),
                |row| row.get(0)
            ).map_err(|e| e.to_string())?
        }
    };

    // Update count on hand
    conn.execute(
        "UPDATE stock_items SET count_on_hand = count_on_hand + ?1, updated_at = ?2 WHERE id = ?3",
        (quantity, now, stock_item_id)
    ).map_err(|e| e.to_string())?;

    // Record movement
    conn.execute(
        r#"INSERT INTO stock_movements (stock_item_id, quantity, action, originator_type, originator_id, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)"#,
        (stock_item_id, quantity, action, originator_type, originator_id, now)
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[ic_cdk::query]
fn admin_get_stock_locations() -> Result<Vec<StockLocation>, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT id, name, code, active, address1, city, state_name, country_code, zipcode, is_default FROM stock_locations ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let locations = stmt.query_map([], |row| {
            Ok(StockLocation {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                active: row.get::<_, i64>(3)? == 1,
                address1: row.get(4)?,
                address2: None, // Missing from query but expected by struct
                city: row.get(5)?,
                state_name: row.get(6)?,
                zipcode: row.get(8)?,
                country_code: row.get(7)?,
                phone: None, // Missing from query
                is_default: row.get::<_, i64>(9)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        Ok(locations)
    })
}

#[ic_cdk::update]
fn admin_create_stock_location(input: CreateStockLocationInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        let id: i64 = conn.query_row(
            r#"INSERT INTO stock_locations (name, code, active, address1, city, state_name, country_code, zipcode, is_default, created_at, updated_at)
               VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9) RETURNING id"#,
            (&input.name, &input.code, &input.address1, &input.city, &input.state_name, &input.country_code, &input.zipcode, if input.is_default.unwrap_or(false) { 1 } else { 0 }, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        Ok(id)
    })
}

#[ic_cdk::update]
fn admin_update_stock_location(id: i64, input: UpdateStockLocationInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        if let Some(name) = input.name {
            conn.execute("UPDATE stock_locations SET name = ?1, updated_at = ?2 WHERE id = ?3", (name, now, id)).ok();
        }
        if let Some(code) = input.code {
            conn.execute("UPDATE stock_locations SET code = ?1, updated_at = ?2 WHERE id = ?3", (code, now, id)).ok();
        }
        if let Some(active) = input.active {
            conn.execute("UPDATE stock_locations SET active = ?1, updated_at = ?2 WHERE id = ?3", (if active { 1 } else { 0 }, now, id)).ok();
        }
        Ok(())
    })
}

#[ic_cdk::update]
fn admin_delete_stock_location(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        // Check if this is the default location
        let is_default: bool = conn.query_row(
            "SELECT is_default FROM stock_locations WHERE id = ?1",
            [id],
            |row| row.get(0)
        ).unwrap_or(false);

        if is_default {
            return Err("Cannot delete the default stock location. Set another location as default first.".to_string());
        }

        // Check if there are stock items at this location
        let stock_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM stock_items WHERE stock_location_id = ?1 AND count_on_hand > 0",
            [id],
            |row| row.get(0)
        ).unwrap_or(0);

        if stock_count > 0 {
            return Err(format!("Cannot delete location with {} items in stock. Transfer or zero out stock first.", stock_count));
        }

        // Delete stock items (should be zero anyway)
        conn.execute("DELETE FROM stock_items WHERE stock_location_id = ?1", [id]).ok();
        // Delete the location
        conn.execute("DELETE FROM stock_locations WHERE id = ?1", [id]).ok();
        Ok(())
    })
}

#[ic_cdk::query]
fn admin_get_stock_items(params: StockQueryParams) -> Result<StockListResponse, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let limit = params.per_page.unwrap_or(20);
        let offset = (params.page.unwrap_or(1) - 1) * limit;

        // Get low stock threshold from settings (default 10)
        let threshold: i64 = if params.low_stock.unwrap_or(false) {
            let threshold_str: String = conn.query_row(
                "SELECT value FROM store_settings WHERE key = 'low_stock_threshold'",
                [],
                |row| row.get(0)
            ).unwrap_or("10".to_string());
            threshold_str.parse().unwrap_or(10)
        } else {
            0 // not used when not filtering
        };

        // Find stock items for a location or all (using parameterized queries)
        let base_query = r#"SELECT si.id, v.id, v.sku, p.name, si.count_on_hand, si.backorderable
                           FROM stock_items si
                           JOIN variants v ON v.id = si.variant_id
                           JOIN products p ON p.id = v.product_id
                           WHERE si.deleted_at IS NULL"#;

        let (items, total_count): (Vec<StockItem>, i64) = match (params.stock_location_id, params.low_stock.unwrap_or(false)) {
            (Some(loc_id), true) => {
                let query = format!("{} AND si.stock_location_id = ?1 AND si.count_on_hand <= ?2 ORDER BY si.count_on_hand ASC LIMIT ?3 OFFSET ?4", base_query);
                let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
                let items = stmt.query_map((loc_id, threshold, limit, offset), |row| {
                    Ok(StockItem {
                        id: row.get(0)?,
                        stock_location_id: loc_id,
                        stock_location_name: "Default".to_string(),
                        variant_id: row.get(1)?,
                        variant_sku: row.get(2)?,
                        product_name: row.get(3)?,
                        count_on_hand: row.get(4)?,
                        backorderable: row.get::<_, i64>(5)? == 1,
                    })
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
                let count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM stock_items si WHERE si.deleted_at IS NULL AND si.stock_location_id = ?1 AND si.count_on_hand <= ?2",
                    (loc_id, threshold), |row| row.get(0)
                ).unwrap_or(0);
                (items, count)
            },
            (Some(loc_id), false) => {
                let query = format!("{} AND si.stock_location_id = ?1 ORDER BY si.count_on_hand ASC LIMIT ?2 OFFSET ?3", base_query);
                let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
                let items = stmt.query_map((loc_id, limit, offset), |row| {
                    Ok(StockItem {
                        id: row.get(0)?,
                        stock_location_id: loc_id,
                        stock_location_name: "Default".to_string(),
                        variant_id: row.get(1)?,
                        variant_sku: row.get(2)?,
                        product_name: row.get(3)?,
                        count_on_hand: row.get(4)?,
                        backorderable: row.get::<_, i64>(5)? == 1,
                    })
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
                let count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM stock_items si WHERE si.deleted_at IS NULL AND si.stock_location_id = ?1",
                    (loc_id,), |row| row.get(0)
                ).unwrap_or(0);
                (items, count)
            },
            (None, true) => {
                let query = format!("{} AND si.count_on_hand <= ?1 ORDER BY si.count_on_hand ASC LIMIT ?2 OFFSET ?3", base_query);
                let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
                let items = stmt.query_map((threshold, limit, offset), |row| {
                    Ok(StockItem {
                        id: row.get(0)?,
                        stock_location_id: params.stock_location_id.unwrap_or(1),
                        stock_location_name: "Default".to_string(),
                        variant_id: row.get(1)?,
                        variant_sku: row.get(2)?,
                        product_name: row.get(3)?,
                        count_on_hand: row.get(4)?,
                        backorderable: row.get::<_, i64>(5)? == 1,
                    })
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
                let count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM stock_items si WHERE si.deleted_at IS NULL AND si.count_on_hand <= ?1",
                    (threshold,), |row| row.get(0)
                ).unwrap_or(0);
                (items, count)
            },
            (None, false) => {
                let query = format!("{} ORDER BY si.count_on_hand ASC LIMIT ?1 OFFSET ?2", base_query);
                let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
                let items = stmt.query_map((limit, offset), |row| {
                    Ok(StockItem {
                        id: row.get(0)?,
                        stock_location_id: params.stock_location_id.unwrap_or(1),
                        stock_location_name: "Default".to_string(),
                        variant_id: row.get(1)?,
                        variant_sku: row.get(2)?,
                        product_name: row.get(3)?,
                        count_on_hand: row.get(4)?,
                        backorderable: row.get::<_, i64>(5)? == 1,
                    })
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
                let count: i64 = conn.query_row(
                    "SELECT COUNT(*) FROM stock_items si WHERE si.deleted_at IS NULL",
                    [], |row| row.get(0)
                ).unwrap_or(0);
                (items, count)
            },
        };

        Ok(StockListResponse {
            items,
            total_count,
            page: params.page.unwrap_or(1),
            per_page: limit,
            total_pages: (total_count as f64 / limit as f64).ceil() as i64,
        })
    })
}

#[ic_cdk::update]
fn admin_adjust_stock(input: StockAdjustmentInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        // Need to find variant_id and stock_location_id for this stock_item_id
        let (variant_id, stock_location_id): (i64, i64) = conn.query_row(
            "SELECT variant_id, stock_location_id FROM stock_items WHERE id = ?1",
            (input.stock_item_id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "Stock item not found".to_string())?;

        move_stock(&conn, variant_id, stock_location_id, input.quantity, "admin_adjustment", "Admin", 0)
    })
}

#[ic_cdk::update]
fn set_shipping_method(shipping_method_id: i64, session_id: Option<String>) -> Result<OrderDetail, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    with_connection(|conn| {
        let now = now();

        // Get order in address state (support guests)
        let order_id: i64 = if is_anonymous {
            if let Some(sess_id) = &session_id {
                conn.query_row(
                    "SELECT id FROM orders WHERE guest_token = ?1 AND state IN ('address', 'delivery')",
                    (sess_id,),
                    |row| row.get(0)
                ).map_err(|_| "No order in address state".to_string())?
            } else {
                return Err("Session ID required for guest checkout".to_string());
            }
        } else {
            conn.query_row(
                "SELECT id FROM orders WHERE (user_id = ?1 OR user_principal = ?2) AND state IN ('address', 'delivery')",
                (user_id, &caller_str),
                |row| row.get(0)
            ).map_err(|_| "No order in address state".to_string())?
        };

        // Verify shipping method exists, is active, and not deleted
        let method_valid: bool = conn.query_row(
            "SELECT 1 FROM shipping_methods WHERE id = ?1 AND active = 1 AND deleted_at IS NULL",
            (shipping_method_id,),
            |_| Ok(true)
        ).unwrap_or(false);

        if !method_valid {
            return Err("Shipping method is not available".to_string());
        }

        // Get or create shipment
        let shipment_id: i64 = match conn.query_row(
            "SELECT id FROM shipments WHERE order_id = ?1",
            (order_id,),
            |row| row.get(0)
        ) {
            Ok(id) => id,
            Err(_) => {
                let number = generate_shipment_number();
                conn.query_row(
                    r#"INSERT INTO shipments (order_id, number, stock_location_id, state, created_at, updated_at)
                       VALUES (?1, ?2, 1, 'pending', ?3, ?3) RETURNING id"#,
                    (order_id, &number, now),
                    |row| row.get(0)
                ).map_err(|e| e.to_string())?
            }
        };

        // Get shipping method cost
        let cost: i64 = calculate_shipping_cost(&conn, shipping_method_id, order_id)?;

        // Set shipping rate
        conn.execute(
            "DELETE FROM shipping_rates WHERE shipment_id = ?1",
            (shipment_id,)
        ).ok();

        conn.execute(
            r#"INSERT INTO shipping_rates (shipment_id, shipping_method_id, cost, selected, created_at, updated_at)
               VALUES (?1, ?2, ?3, 1, ?4, ?4)"#,
            (shipment_id, shipping_method_id, cost, now)
        ).map_err(|e| e.to_string())?;

        // Update shipment cost
        conn.execute(
            "UPDATE shipments SET cost = ?1, updated_at = ?2 WHERE id = ?3",
            (cost, now, shipment_id)
        ).map_err(|e| e.to_string())?;

        // Move to delivery state
        conn.execute(
            "UPDATE orders SET state = 'delivery', shipment_total = ?1, updated_at = ?2 WHERE id = ?3",
            (cost, now, order_id)
        ).map_err(|e| e.to_string())?;

        recalculate_order(&conn, order_id)?;
        get_order_detail(&conn, order_id)
    })
}

#[ic_cdk::update]
fn complete_checkout(session_id: Option<String>) -> Result<OrderDetail, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    let order_detail = with_connection(|conn| {
        let now = now();

        // Get order ready for completion (support guests)
        let order_id: i64 = if is_anonymous {
            if let Some(sess_id) = &session_id {
                conn.query_row(
                    "SELECT id FROM orders WHERE guest_token = ?1 AND state = 'delivery'",
                    (sess_id,),
                    |row| row.get(0)
                ).map_err(|_| "No order ready for checkout".to_string())?
            } else {
                return Err("Session ID required for guest checkout".to_string());
            }
        } else {
            conn.query_row(
                "SELECT id FROM orders WHERE (user_id = ?1 OR user_principal = ?2) AND state = 'delivery'",
                (user_id, &caller_str),
                |row| row.get(0)
            ).map_err(|_| "No order ready for checkout".to_string())?
        };

        // Verify inventory is still available before completing (prevents race condition)
        {
            let mut stmt = conn.prepare(
                "SELECT li.variant_id, li.quantity, p.name, v.sku FROM line_items li
                 JOIN variants v ON li.variant_id = v.id
                 JOIN products p ON v.product_id = p.id
                 WHERE li.order_id = ?1"
            ).map_err(|e| e.to_string())?;

            let items: Vec<(i64, i64, String, String)> = stmt.query_map((order_id,), |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            }).map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

            for (variant_id, quantity, product_name, sku) in items {
                let available: i64 = conn.query_row(
                    "SELECT COALESCE(SUM(count_on_hand), 0) FROM stock_items WHERE variant_id = ?1 AND deleted_at IS NULL",
                    (variant_id,),
                    |row| row.get(0)
                ).unwrap_or(0);

                if available < quantity {
                    return Err(format!(
                        "Insufficient stock for {} (SKU: {}). Requested: {}, Available: {}",
                        product_name, sku, quantity, available
                    ));
                }
            }
        }

        // Create payment record
        let payment_method: (i64, String) = conn.query_row(
            "SELECT id, name FROM payment_methods WHERE active = 1 AND type = 'IcpPayment' LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "No active payment method found".to_string())?;

        let total: i64 = conn.query_row("SELECT total FROM orders WHERE id = ?1", (order_id,), |row| row.get(0)).unwrap_or(0);

        conn.execute(
            r#"INSERT INTO payments (order_id, payment_method_id, amount, state, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'completed', ?4, ?4)"#,
            (order_id, payment_method.0, total, now)
        ).map_err(|e| e.to_string())?;

        // Decrease stock
        let line_items: Vec<(i64, i64)> = {
            let mut stmt = conn.prepare(
                "SELECT variant_id, quantity FROM line_items WHERE order_id = ?1"
            ).map_err(|e| e.to_string())?;

            let result: Vec<(i64, i64)> = stmt.query_map((order_id,), |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| e.to_string())?
                .collect::<ic_rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;
            result
        };

        for (variant_id, quantity) in line_items {
            let line_item_id: i64 = conn.query_row(
                "SELECT id FROM line_items WHERE order_id = ?1 AND variant_id = ?2",
                (order_id, variant_id),
                |row| row.get(0)
            ).unwrap_or(0);

            move_stock(&conn, variant_id, 1, -quantity, "sold", "Order", order_id).ok();

            // Create inventory units
            for _ in 0..quantity {
                conn.execute(
                    r#"INSERT INTO inventory_units (variant_id, shipment_id, line_item_id, state, pending, created_at, updated_at)
                       VALUES (?1, (SELECT id FROM shipments WHERE order_id = ?2), ?3, 'on_hand', 0, ?4, ?4)"#,
                    (variant_id, order_id, line_item_id, now)
                ).ok();
            }
        }

        // Complete order
        conn.execute(
            r#"UPDATE orders SET
               state = 'complete', payment_state = 'paid', shipment_state = 'ready',
               completed_at = ?1, updated_at = ?1
               WHERE id = ?2"#,
            (now, order_id)
        ).map_err(|e| e.to_string())?;

        // Update shipment state
        conn.execute(
            "UPDATE shipments SET state = 'ready', updated_at = ?1 WHERE order_id = ?2",
            (now, order_id)
        ).ok();

        get_order_detail(&conn, order_id)
    })?;

    // Send confirmation email (async, ignore errors so we don't fail the checkout)
    let maybe_email = order_detail.email.clone();
    let order_number = order_detail.number.clone();
    let total = order_detail.total;

    // Extract customer name from shipping address
    let customer_name = order_detail.ship_address.as_ref()
        .map(|addr| format!("{} {}", addr.firstname, addr.lastname))
        .unwrap_or_else(|| "Customer".to_string());

    // Format shipping address
    let shipping_address = order_detail.ship_address.as_ref()
        .map(|addr| {
            let mut parts = vec![addr.address1.clone()];
            if let Some(ref addr2) = addr.address2 {
                if !addr2.is_empty() {
                    parts.push(addr2.clone());
                }
            }
            parts.push(format!("{}, {} {}", addr.city, addr.state_name.clone().unwrap_or_default(), addr.zipcode));
            parts.push(addr.country_code.clone());
            parts.join("\n")
        })
        .unwrap_or_default();

    // Format line items for email
    let items_text = order_detail.line_items.iter()
        .map(|item| format!("{} x {} - ${:.2}", item.quantity, item.product_name, item.price as f64 / 100.0))
        .collect::<Vec<_>>()
        .join("\n");

    if let Some(email) = maybe_email {
        ic_cdk::spawn(async move {
            let _ = send_order_confirmation(email, order_number, total, customer_name, shipping_address, items_text).await;
        });
    }

    Ok(order_detail)
}

// ============================================
// ORDERS API
// ============================================

#[ic_cdk::query]
fn get_my_orders() -> Result<Vec<OrderSummary>, String> {
    let caller_str = ic_cdk::api::caller().to_string();
    let user_id = get_current_user_id();

    with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, number, state, total, item_count, payment_state, shipment_state, completed_at, created_at
               FROM orders
               WHERE (user_id = ?1 OR user_principal = ?2) AND state != 'cart'
               ORDER BY created_at DESC"#
        ).map_err(|e| e.to_string())?;

        let orders: Vec<OrderSummary> = stmt.query_map((user_id, &caller_str), |row| {
            Ok(OrderSummary {
                id: row.get(0)?,
                number: row.get(1)?,
                state: row.get(2)?,
                total: row.get(3)?,
                item_count: row.get(4)?,
                payment_state: row.get(5)?,
                shipment_state: row.get(6)?,
                completed_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        Ok(orders)
    })
}

#[ic_cdk::query]
fn get_order(number: String) -> Result<OrderDetail, String> {
    let caller_str = ic_cdk::api::caller().to_string();
    let user_id = get_current_user_id();

    with_connection(|conn| {
        let order_id: i64 = conn.query_row(
            r#"SELECT id FROM orders
               WHERE number = ?1 AND (user_id = ?2 OR user_principal = ?3)"#,
            (&number, user_id, &caller_str),
            |row| row.get(0)
        ).map_err(|_| "Order not found".to_string())?;

        get_order_detail(&conn, order_id)
    })
}

// ============================================
// ADMIN: ORDERS
// ============================================

#[ic_cdk::query]
fn admin_get_orders(params: OrderQueryParams) -> Result<OrderListResponse, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        // Always exclude 'cart' state orders (incomplete checkouts)
        let mut conditions = vec!["state != 'cart'".to_string()];
        let mut query_params: Vec<Box<dyn ic_rusqlite::ToSql>> = vec![];

        if let Some(ref state) = params.state {
            query_params.push(Box::new(state.clone()));
            conditions.push(format!("state = ?{}", query_params.len()));
        }

        if let Some(ref payment_state) = params.payment_state {
            query_params.push(Box::new(payment_state.clone()));
            conditions.push(format!("payment_state = ?{}", query_params.len()));
        }

        let where_clause = format!("WHERE {}", conditions.join(" AND "));

        // Count
        let count_sql = format!("SELECT COUNT(*) FROM orders {}", where_clause);
        let param_refs: Vec<&dyn ic_rusqlite::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();
        let total_count: i64 = conn.query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))
            .map_err(|e| e.to_string())?;

        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).min(100);
        let offset = (page - 1) * per_page;

        let sql = format!(
            r#"SELECT o.id, o.number, o.email, o.state, o.total, o.item_count, o.payment_state, o.shipment_state, s.tracking, o.completed_at, o.created_at
               FROM orders o
               LEFT JOIN shipments s ON s.order_id = o.id
               {}
               ORDER BY o.created_at DESC
               LIMIT ?{} OFFSET ?{}"#,
            where_clause.replace("state", "o.state").replace("payment_state", "o.payment_state"),
            query_params.len() + 1,
            query_params.len() + 2
        );

        query_params.push(Box::new(per_page));
        query_params.push(Box::new(offset));

        let param_refs: Vec<&dyn ic_rusqlite::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let orders: Vec<AdminOrderSummary> = stmt.query_map(param_refs.as_slice(), |row| {
            Ok(AdminOrderSummary {
                id: row.get(0)?,
                number: row.get(1)?,
                email: row.get(2)?,
                state: row.get(3)?,
                total: row.get(4)?,
                item_count: row.get(5)?,
                payment_state: row.get(6)?,
                shipment_state: row.get(7)?,
                tracking_number: row.get(8)?,
                completed_at: row.get(9)?,
                created_at: row.get(10)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        let total_pages = ((total_count as f64) / (per_page as f64)).ceil() as i64;

        Ok(OrderListResponse {
            orders,
            total_count,
            page,
            per_page,
            total_pages,
        })
    })
}

#[ic_cdk::update]
fn admin_update_order_state(order_id: i64, state: String) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    // Validate state is a valid order state
    const VALID_STATES: &[&str] = &["cart", "address", "delivery", "payment", "confirm", "complete", "canceled", "returned"];
    if !VALID_STATES.contains(&state.as_str()) {
        return Err(format!("Invalid order state '{}'. Valid states: {}", state, VALID_STATES.join(", ")));
    }

    with_connection(|conn| {
        // Get current state for transition validation
        let current_state: String = conn.query_row(
            "SELECT state FROM orders WHERE id = ?1",
            (order_id,),
            |row| row.get(0)
        ).map_err(|_| "Order not found".to_string())?;

        // Validate state transitions (prevent going backwards except for cancel/return)
        let state_order = |s: &str| -> i32 {
            match s {
                "cart" => 0, "address" => 1, "delivery" => 2, "payment" => 3,
                "confirm" => 4, "complete" => 5, "canceled" => 99, "returned" => 100, _ => -1
            }
        };

        let current_order = state_order(&current_state);
        let new_order = state_order(&state);

        // Allow: forward progress, cancel from any state, return from complete
        if new_order < current_order && state != "canceled" && !(state == "returned" && current_state == "complete") {
            return Err(format!("Cannot transition from '{}' to '{}'. Only forward transitions allowed (except cancel/return).", current_state, state));
        }

        let now = now();
        conn.execute(
            "UPDATE orders SET state = ?1, updated_at = ?2 WHERE id = ?3",
            (&state, now, order_id)
        ).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[ic_cdk::update]
fn admin_ship_order(order_id: i64, tracking: Option<String>) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Update shipment
        conn.execute(
            "UPDATE shipments SET state = 'shipped', tracking = ?1, shipped_at = ?2, updated_at = ?2 WHERE order_id = ?3",
            (&tracking, now, order_id)
        ).map_err(|e| e.to_string())?;

        // Update order
        conn.execute(
            "UPDATE orders SET shipment_state = 'shipped', updated_at = ?1 WHERE id = ?2",
            (now, order_id)
        ).map_err(|e| e.to_string())?;

        Ok(())
    })
}

#[ic_cdk::update]
fn admin_update_tracking(order_id: i64, tracking: Option<String>) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Try to update tracking number on existing shipment
        let rows_updated = conn.execute(
            "UPDATE shipments SET tracking = ?1, updated_at = ?2 WHERE order_id = ?3",
            (&tracking, now, order_id)
        ).map_err(|e| e.to_string())?;

        if rows_updated == 0 {
            // No shipment exists - create one for this order
            let number = format!("H{}", now / 1_000_000); // Generate shipment number
            conn.execute(
                r#"INSERT INTO shipments (order_id, number, stock_location_id, state, tracking, created_at, updated_at)
                   VALUES (?1, ?2, 1, 'pending', ?3, ?4, ?4)"#,
                (order_id, &number, &tracking, now)
            ).map_err(|e| e.to_string())?;

            // Also update order shipment_state if not already set
            conn.execute(
                "UPDATE orders SET shipment_state = COALESCE(shipment_state, 'pending'), updated_at = ?1 WHERE id = ?2",
                (now, order_id)
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    })
}

// ============================================
// ADMIN: ANALYTICS
// ============================================

#[ic_cdk::query]
fn get_dashboard_stats() -> Result<DashboardStats, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let total_revenue: i64 = conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE state = 'complete'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        let total_orders: i64 = conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE state != 'cart'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        let pending_orders: i64 = conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE shipment_state IN ('pending', 'ready')",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        // Count unique customers by email (includes both registered and guest)
        let total_customers: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT email) FROM orders WHERE email IS NOT NULL AND email != ''",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        // Fetch low stock threshold from settings (default 10)
        let threshold_str: String = conn.query_row(
            "SELECT value FROM store_settings WHERE key = 'low_stock_threshold'",
            [],
            |row| row.get(0)
        ).unwrap_or("10".to_string());
        let threshold: i64 = threshold_str.parse().unwrap_or(10);

        let low_stock_count: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM stock_items WHERE count_on_hand <= {} AND deleted_at IS NULL", threshold),
            [],
            |row| row.get(0)
        ).unwrap_or(0);


        let total_products: i64 = conn.query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        Ok(DashboardStats {
            total_revenue,
            total_orders,
            pending_orders,
            total_customers,
            low_stock_count,
            total_products,
        })
    })
}

#[ic_cdk::query]
fn get_revenue_stats() -> Result<RevenueData, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now_ns = now();
        // Convert nanoseconds to seconds for date calculations
        let now_secs = now_ns / 1_000_000_000;
        let day_secs: i64 = 86400;
        let week_secs: i64 = day_secs * 7;
        let month_secs: i64 = day_secs * 30;

        // Start of today (midnight)
        let start_of_today_secs = (now_secs / day_secs) * day_secs;
        let start_of_today_ns = start_of_today_secs * 1_000_000_000;

        // Start of this week (7 days ago)
        let start_of_week_ns = (now_secs - week_secs) * 1_000_000_000;

        // Start of this month (30 days ago)
        let start_of_month_ns = (now_secs - month_secs) * 1_000_000_000;

        // Total revenue & orders (completed only)
        let total_revenue: i64 = conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE state = 'complete'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        let total_orders: i64 = conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE state = 'complete'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        let average_order_value = if total_orders > 0 {
            total_revenue / total_orders
        } else {
            0
        };

        // Today's stats
        let (orders_today, revenue_today): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE state = 'complete' AND completed_at >= ?1",
            (start_of_today_ns,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).unwrap_or((0, 0));

        // This week's stats
        let (orders_this_week, revenue_this_week): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE state = 'complete' AND completed_at >= ?1",
            (start_of_week_ns,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).unwrap_or((0, 0));

        // This month's stats
        let (orders_this_month, revenue_this_month): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE state = 'complete' AND completed_at >= ?1",
            (start_of_month_ns,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).unwrap_or((0, 0));

        // Top selling products (by revenue)
        let mut top_stmt = conn.prepare(
            r#"SELECT p.id, p.name, SUM(li.quantity) as qty_sold, SUM(li.quantity * li.price) as revenue
               FROM line_items li
               JOIN orders o ON o.id = li.order_id
               JOIN variants v ON v.id = li.variant_id
               JOIN products p ON p.id = v.product_id
               WHERE o.state = 'complete'
               GROUP BY p.id
               ORDER BY revenue DESC
               LIMIT 5"#
        ).map_err(|e| e.to_string())?;

        let top_products: Vec<TopProduct> = top_stmt.query_map([], |row| {
            Ok(TopProduct {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                quantity_sold: row.get(2)?,
                revenue: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Recent orders (last 10 completed)
        let mut recent_stmt = conn.prepare(
            r#"SELECT id, number, total, completed_at, email
               FROM orders
               WHERE state = 'complete'
               ORDER BY completed_at DESC
               LIMIT 10"#
        ).map_err(|e| e.to_string())?;

        let recent_orders: Vec<RecentOrderSummary> = recent_stmt.query_map([], |row| {
            Ok(RecentOrderSummary {
                id: row.get(0)?,
                number: row.get(1)?,
                total: row.get(2)?,
                created_at: row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                email: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        Ok(RevenueData {
            stats: RevenueStats {
                total_revenue,
                total_orders,
                average_order_value,
                orders_today,
                revenue_today,
                orders_this_week,
                revenue_this_week,
                orders_this_month,
                revenue_this_month,
            },
            top_products,
            recent_orders,
        })
    })
}

// ============================================
// SHIPPING METHODS
// ============================================

#[ic_cdk::query]
fn get_shipping_methods() -> Result<Vec<ShippingMethod>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, name, display_on, tracking_url, admin_name, code, carrier, service_level, base_cost, active
               FROM shipping_methods WHERE deleted_at IS NULL AND active = 1
               ORDER BY id ASC"#
        ).map_err(|e| e.to_string())?;

        let methods: Vec<ShippingMethod> = stmt.query_map([], |row| {
            Ok(ShippingMethod {
                id: row.get(0)?,
                name: row.get(1)?,
                display_on: row.get(2)?,
                tracking_url: row.get(3)?,
                admin_name: row.get(4)?,
                code: row.get(5)?,
                carrier: row.get(6)?,
                service_level: row.get(7)?,
                cost: row.get(8)?,
                active: row.get::<_, i64>(9)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        Ok(methods)
    })
}

#[ic_cdk::update]
fn admin_create_shipping_method(input: CreateShippingMethodInput) -> Result<i64, String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        let active: i64 = if input.active.unwrap_or(true) { 1 } else { 0 };
        conn.execute(
            r#"INSERT INTO shipping_methods (name, admin_name, code, carrier, service_level, tracking_url, display_on, base_cost, active, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)"#,
            (
                &input.name,
                &input.admin_name,
                &input.code,
                &input.carrier,
                &input.service_level,
                &input.tracking_url,
                &input.display_on,
                &input.base_cost,
                active,
                now(),
            )
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    })
}

#[ic_cdk::update]
fn admin_update_shipping_method(id: i64, input: UpdateShippingMethodInput) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        if let Some(name) = input.name {
            conn.execute("UPDATE shipping_methods SET name = ?1, updated_at = ?2 WHERE id = ?3", (&name, now(), id))?;
        }
        if let Some(admin_name) = input.admin_name {
            conn.execute("UPDATE shipping_methods SET admin_name = ?1, updated_at = ?2 WHERE id = ?3", (&admin_name, now(), id))?;
        }
        if let Some(code) = input.code {
            conn.execute("UPDATE shipping_methods SET code = ?1, updated_at = ?2 WHERE id = ?3", (&code, now(), id))?;
        }
        if let Some(carrier) = input.carrier {
            conn.execute("UPDATE shipping_methods SET carrier = ?1, updated_at = ?2 WHERE id = ?3", (&carrier, now(), id))?;
        }
        if let Some(service_level) = input.service_level {
            conn.execute("UPDATE shipping_methods SET service_level = ?1, updated_at = ?2 WHERE id = ?3", (&service_level, now(), id))?;
        }
        if let Some(tracking_url) = input.tracking_url {
            conn.execute("UPDATE shipping_methods SET tracking_url = ?1, updated_at = ?2 WHERE id = ?3", (&tracking_url, now(), id))?;
        }
        if let Some(display_on) = input.display_on {
            conn.execute("UPDATE shipping_methods SET display_on = ?1, updated_at = ?2 WHERE id = ?3", (&display_on, now(), id))?;
        }
        if let Some(base_cost) = input.base_cost {
            conn.execute("UPDATE shipping_methods SET base_cost = ?1, updated_at = ?2 WHERE id = ?3", (base_cost, now(), id))?;
        }
        if let Some(active) = input.active {
            let active_int: i64 = if active { 1 } else { 0 };
            conn.execute("UPDATE shipping_methods SET active = ?1, updated_at = ?2 WHERE id = ?3", (active_int, now(), id))?;
        }
        Ok(())
    }).map_err(|e: ic_rusqlite::Error| e.to_string())
}

#[ic_cdk::update]
fn admin_delete_shipping_method(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        conn.execute("UPDATE shipping_methods SET deleted_at = ?1 WHERE id = ?2", (now(), id))?;
        Ok(())
    }).map_err(|e: ic_rusqlite::Error| e.to_string())
}

#[ic_cdk::query]
fn admin_get_shipping_methods() -> Result<Vec<ShippingMethod>, String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT id, name, display_on, tracking_url, admin_name, code, carrier, service_level, base_cost, active
               FROM shipping_methods WHERE deleted_at IS NULL
               ORDER BY id ASC"#
        ).map_err(|e| e.to_string())?;

        let methods: Vec<ShippingMethod> = stmt.query_map([], |row| {
            Ok(ShippingMethod {
                id: row.get(0)?,
                name: row.get(1)?,
                display_on: row.get(2)?,
                tracking_url: row.get(3)?,
                admin_name: row.get(4)?,
                code: row.get(5)?,
                carrier: row.get(6)?,
                service_level: row.get(7)?,
                cost: row.get(8)?,
                active: row.get::<_, i64>(9)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        Ok(methods)
    })
}

// ============================================
// TAX RATES
// ============================================

#[ic_cdk::query]
fn get_tax_rates() -> Result<Vec<TaxRate>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"SELECT tr.id, tr.name, tr.amount, tr.zone_id, z.name as zone_name, 
                      tr.tax_category_id, tc.name as category_name, tr.included_in_price, tr.show_rate_in_label
               FROM tax_rates tr
               LEFT JOIN zones z ON tr.zone_id = z.id
               LEFT JOIN tax_categories tc ON tr.tax_category_id = tc.id
               WHERE tr.deleted_at IS NULL"#
        ).map_err(|e| e.to_string())?;

        let rates: Vec<TaxRate> = stmt.query_map([], |row| {
            Ok(TaxRate {
                id: row.get(0)?,
                name: row.get(1)?,
                amount: row.get(2)?,
                zone_id: row.get(3)?,
                zone_name: row.get(4)?,
                tax_category_id: row.get(5)?,
                tax_category_name: row.get(6)?,
                included_in_price: row.get(7)?,
                show_rate_in_label: row.get(8)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        Ok(rates)
    })
}

#[ic_cdk::update]
fn admin_create_tax_rate(input: CreateTaxRateInput) -> Result<i64, String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        conn.execute(
            r#"INSERT INTO tax_rates (name, amount, zone_id, tax_category_id, included_in_price, show_rate_in_label, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)"#,
            (
                &input.name,
                &input.amount,
                &input.zone_id,
                &input.tax_category_id,
                &input.included_in_price.unwrap_or(false),
                now(),
            )
        ).map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    })
}

#[ic_cdk::update]
fn admin_update_tax_rate(id: i64, input: UpdateTaxRateInput) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        if let Some(name) = input.name {
            conn.execute("UPDATE tax_rates SET name = ?1, updated_at = ?2 WHERE id = ?3", (&name, now(), id))?;
        }
        if let Some(amount) = input.amount {
            conn.execute("UPDATE tax_rates SET amount = ?1, updated_at = ?2 WHERE id = ?3", (&amount, now(), id))?;
        }
        if let Some(zone_id) = input.zone_id {
            conn.execute("UPDATE tax_rates SET zone_id = ?1, updated_at = ?2 WHERE id = ?3", (zone_id, now(), id))?;
        }
        if let Some(tax_category_id) = input.tax_category_id {
            conn.execute("UPDATE tax_rates SET tax_category_id = ?1, updated_at = ?2 WHERE id = ?3", (tax_category_id, now(), id))?;
        }
        if let Some(included_in_price) = input.included_in_price {
            conn.execute("UPDATE tax_rates SET included_in_price = ?1, updated_at = ?2 WHERE id = ?3", (included_in_price, now(), id))?;
        }
        Ok(())
    }).map_err(|e: ic_rusqlite::Error| e.to_string())
}

#[ic_cdk::update]
fn admin_delete_tax_rate(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        conn.execute("UPDATE tax_rates SET deleted_at = ?1 WHERE id = ?2", (now(), id))?;
        Ok(())
    }).map_err(|e: ic_rusqlite::Error| e.to_string())
}

#[ic_cdk::query]
fn get_zones() -> Result<Vec<Zone>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT id, name, description, zone_members_count FROM zones").map_err(|e| e.to_string())?;
        let zone_rows: Vec<(i64, String, Option<String>, i64)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        let mut zones = Vec::new();
        for (id, name, description, member_count) in zone_rows {
            // Get members for this zone
            let mut member_stmt = conn.prepare(
                "SELECT id, zoneable_type, zoneable_id FROM zone_members WHERE zone_id = ?1"
            ).map_err(|e| e.to_string())?;
            let members: Vec<ZoneMember> = member_stmt.query_map([id], |row| {
                Ok(ZoneMember {
                    id: row.get(0)?,
                    zoneable_type: row.get(1)?,
                    zoneable_id: row.get(2)?,
                })
            }).map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

            zones.push(Zone {
                id,
                name,
                description,
                member_count,
                members,
            });
        }
        Ok(zones)
    })
}

#[ic_cdk::update]
fn admin_create_zone(input: CreateZoneInput) -> Result<i64, String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        let now = now();
        conn.execute(
            "INSERT INTO zones (name, description, zone_members_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
            (&input.name, &input.description, input.members.len() as i64, now)
        ).map_err(|e| e.to_string())?;

        let zone_id = conn.last_insert_rowid();

        // Insert members
        for member in &input.members {
            conn.execute(
                "INSERT INTO zone_members (zone_id, zoneable_type, zoneable_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
                (zone_id, &member.zoneable_type, &member.zoneable_id, now)
            ).map_err(|e| e.to_string())?;
        }

        Ok(zone_id)
    })
}

#[ic_cdk::update]
fn admin_update_zone(id: i64, input: UpdateZoneInput) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        let now = now();

        if let Some(name) = input.name {
            conn.execute("UPDATE zones SET name = ?1, updated_at = ?2 WHERE id = ?3", (&name, now, id))
                .map_err(|e| e.to_string())?;
        }
        if let Some(description) = input.description {
            conn.execute("UPDATE zones SET description = ?1, updated_at = ?2 WHERE id = ?3", (&description, now, id))
                .map_err(|e| e.to_string())?;
        }

        // If members provided, replace all members
        if let Some(members) = input.members {
            // Delete existing members
            conn.execute("DELETE FROM zone_members WHERE zone_id = ?1", [id])
                .map_err(|e| e.to_string())?;

            // Insert new members
            for member in &members {
                conn.execute(
                    "INSERT INTO zone_members (zone_id, zoneable_type, zoneable_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
                    (id, &member.zoneable_type, &member.zoneable_id, now)
                ).map_err(|e| e.to_string())?;
            }

            // Update member count
            conn.execute("UPDATE zones SET zone_members_count = ?1, updated_at = ?2 WHERE id = ?3",
                (members.len() as i64, now, id))
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    })
}

#[ic_cdk::update]
fn admin_delete_zone(id: i64) -> Result<(), String> {
    if !is_admin() { return Err("Unauthorized".to_string()); }
    with_connection(|conn| {
        // Delete members first
        conn.execute("DELETE FROM zone_members WHERE zone_id = ?1", [id])
            .map_err(|e| e.to_string())?;
        // Delete zone
        conn.execute("DELETE FROM zones WHERE id = ?1", [id])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[ic_cdk::query]
fn get_tax_categories() -> Result<Vec<TaxCategory>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT id, name, description, is_default, tax_code FROM tax_categories").map_err(|e| e.to_string())?;
        let items: Vec<TaxCategory> = stmt.query_map([], |row| {
            Ok(TaxCategory {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_default: row.get(3)?,
                tax_code: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
        Ok(items)
    })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

fn recalculate_order(conn: &Connection, order_id: i64) -> Result<(), String> {
    let now = now();

    // 1. Recalculate Taxes
    apply_tax_adjustments(conn, order_id).ok();

    // 2. Calculate item total and count
    let (item_total, item_count): (i64, i64) = conn.query_row(
        "SELECT COALESCE(SUM(price * quantity), 0), COALESCE(SUM(quantity), 0) FROM line_items WHERE order_id = ?1",
        (order_id,),
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| e.to_string())?;

    // 3. Sum adjustments
    let adjustment_total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM adjustments WHERE order_id = ?1",
        (order_id,),
        |row| row.get(0)
    ).unwrap_or(0);

    let promo_total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM adjustments WHERE order_id = ?1 AND source_type = 'Promotion'",
        (order_id,),
        |row| row.get(0)
    ).unwrap_or(0);

    let tax_total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM adjustments WHERE order_id = ?1 AND source_type = 'TaxRate'",
        (order_id,),
        |row| row.get(0)
    ).unwrap_or(0);

    // 4. Get shipment total
    let shipment_total: i64 = conn.query_row(
        "SELECT COALESCE(SUM(cost), 0) FROM shipments WHERE order_id = ?1",
        (order_id,),
        |row| row.get(0)
    ).unwrap_or(0);

    let total = item_total + shipment_total + adjustment_total;

    conn.execute(
        r#"UPDATE orders SET
           item_total = ?1, item_count = ?2, shipment_total = ?3,
           adjustment_total = ?4, promo_total = ?5, additional_tax_total = ?6,
           total = ?7, updated_at = ?8
           WHERE id = ?9"#,
        (item_total, item_count, shipment_total, adjustment_total, promo_total, tax_total, total, now, order_id)
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn apply_tax_adjustments(conn: &Connection, order_id: i64) -> Result<(), String> {
    let now = now();

    // Get shipping address state/country
    let address: Option<(String, String)> = conn.query_row(
        r#"SELECT country_code, state_name FROM addresses a
           JOIN orders o ON o.ship_address_id = a.id
           WHERE o.id = ?1"#,
        (order_id,),
        |row| Ok((row.get(0)?, row.get::<_, Option<String>>(1)?.unwrap_or_default()))
    ).ok();

    if let Some((country, state)) = address {
        // Find matching zonemembers and then zones
        let mut zone_stmt = conn.prepare(
            r#"SELECT DISTINCT z.id FROM zones z
               JOIN zone_members zm ON zm.zone_id = z.id
               WHERE (zm.zoneable_type = 'Country' AND zm.zoneable_id = ?1)
               OR (zm.zoneable_type = 'State' AND zm.zoneable_id = ?2)"#
        ).map_err(|e| e.to_string())?;

        let zone_ids: Vec<i64> = zone_stmt.query_map((&country, &state), |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<i64>>>().map_err(|e| e.to_string())?;

        // Clear existing tax adjustments
        conn.execute("DELETE FROM adjustments WHERE order_id = ?1 AND source_type = 'TaxRate'", (order_id,)).ok();

        if !zone_ids.is_empty() {
            // Find tax rates for these zones using parameterized query
            // Build placeholders for IN clause: ?1, ?2, ?3, etc.
            let placeholders: String = zone_ids.iter().enumerate()
                .map(|(i, _)| format!("?{}", i + 1))
                .collect::<Vec<_>>()
                .join(",");

            let mut rate_stmt = conn.prepare(
                &format!("SELECT id, name, amount FROM tax_rates WHERE zone_id IN ({})", placeholders)
            ).map_err(|e| e.to_string())?;

            // Convert zone_ids to params slice for rusqlite
            let params: Vec<&dyn ic_rusqlite::ToSql> = zone_ids.iter()
                .map(|id| id as &dyn ic_rusqlite::ToSql)
                .collect();

            let rates = rate_stmt.query_map(params.as_slice(), |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?))
            }).map_err(|e| e.to_string())?;

            let item_total: i64 = conn.query_row("SELECT item_total FROM orders WHERE id = ?1", (order_id,), |row| row.get(0)).unwrap_or(0);

            for rate in rates {
                let (rate_id, rate_name, amount) = rate.map_err(|e| e.to_string())?;
                let tax_amount = (item_total as f64 * amount) as i64;
                
                if tax_amount != 0 {
                    conn.execute(
                        r#"INSERT INTO adjustments (source_type, source_id, adjustable_type, adjustable_id, order_id, amount, label, created_at, updated_at)
                           VALUES ('TaxRate', ?1, 'Order', ?2, ?2, ?3, ?4, ?5, ?5)"#,
                        (rate_id, order_id, tax_amount, format!("Tax: {}", rate_name), now)
                    ).ok();
                }
            }
        }
    }

    Ok(())
}

fn get_order_by_state(conn: &Connection, principal: &str, state: &str) -> Result<Option<OrderDetail>, String> {
    let order_id: Option<i64> = conn.query_row(
        "SELECT id FROM orders WHERE user_principal = ?1 AND state = ?2",
        (principal, state),
        |row| row.get(0)
    ).ok();

    match order_id {
        Some(id) => Ok(Some(get_order_detail(conn, id)?)),
        None => Ok(None),
    }
}

fn get_order_detail(conn: &Connection, order_id: i64) -> Result<OrderDetail, String> {
    let order: (i64, String, Option<String>, String, i64, i64, i64, i64, i64, Option<String>, Option<String>, Option<i64>, Option<i64>, Option<i64>, i64) = conn.query_row(
        r#"SELECT id, number, email, state, item_total, shipment_total, total, item_count,
           adjustment_total, payment_state, shipment_state,
           ship_address_id, bill_address_id, completed_at, created_at
           FROM orders WHERE id = ?1"#,
        (order_id,),
        |row| Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
            row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?,
            row.get(10)?, row.get(11)?, row.get(12)?, row.get(13)?, row.get(14)?
        ))
    ).map_err(|e| e.to_string())?;

    // Get line items
    let mut line_stmt = conn.prepare(
        r#"SELECT li.id, li.variant_id, li.quantity, li.price, li.currency,
           p.name as product_name, p.slug, v.sku,
           COALESCE(
               (SELECT attachment_url FROM assets WHERE viewable_type = 'Variant' AND viewable_id = li.variant_id LIMIT 1),
               (SELECT attachment_url FROM assets WHERE viewable_type = 'Variant' AND viewable_id = (
                   SELECT id FROM variants WHERE product_id = v.product_id AND is_master = 1 LIMIT 1
               ) LIMIT 1)
           ) as image_url
           FROM line_items li
           JOIN variants v ON v.id = li.variant_id
           JOIN products p ON p.id = v.product_id
           WHERE li.order_id = ?1"#
    ).map_err(|e| e.to_string())?;

    let line_items: Vec<LineItemDetail> = line_stmt.query_map((order_id,), |row| {
        let quantity: i64 = row.get(2)?;
        let price: i64 = row.get(3)?;
        Ok(LineItemDetail {
            id: row.get(0)?,
            variant_id: row.get(1)?,
            quantity,
            price,
            total: quantity * price,
            currency: row.get(4)?,
            product_name: row.get(5)?,
            product_slug: row.get(6)?,
            variant_sku: row.get(7)?,
            image_url: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<ic_rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

    // Get shipping address
    let ship_address: Option<AddressDetail> = if let Some(addr_id) = order.11 {
        conn.query_row(
            r#"SELECT id, firstname, lastname, address1, address2, city, state_name, zipcode, country_code, phone
               FROM addresses WHERE id = ?1"#,
            (addr_id,),
            |row| Ok(AddressDetail {
                id: row.get(0)?,
                firstname: row.get(1)?,
                lastname: row.get(2)?,
                address1: row.get(3)?,
                address2: row.get(4)?,
                city: row.get(5)?,
                state_name: row.get(6)?,
                zipcode: row.get(7)?,
                country_code: row.get(8)?,
                phone: row.get(9)?,
                is_default: false, // simplified
            })
        ).ok()
    } else {
        None
    };

    // Get shipment
    let shipment: Option<ShipmentDetail> = conn.query_row(
        r#"SELECT s.id, s.number, s.tracking, s.cost, s.state, s.shipped_at,
           sm.id as method_id, sm.name as method_name
           FROM shipments s
           LEFT JOIN shipping_rates sr ON sr.shipment_id = s.id AND sr.selected = 1
           LEFT JOIN shipping_methods sm ON sm.id = sr.shipping_method_id
           WHERE s.order_id = ?1"#,
        (order_id,),
        |row| Ok(ShipmentDetail {
            id: row.get(0)?,
            number: row.get(1)?,
            tracking: row.get(2)?,
            cost: row.get(3)?,
            state: row.get(4)?,
            shipped_at: row.get(5)?,
            shipping_method_id: row.get(6)?,
            shipping_method_name: row.get(7)?,
        })
    ).ok();

    let adjustments = get_order_adjustments(conn, order_id).unwrap_or_default();
    let tax_total: i64 = adjustments.iter().filter(|a| a.source_type.as_deref() == Some("TaxRate")).map(|a| a.amount).sum();
    let promo_total: i64 = adjustments.iter().filter(|a| a.source_type.as_deref() == Some("Promotion")).map(|a| a.amount).sum();

    Ok(OrderDetail {
        id: order.0,
        number: order.1,
        email: order.2,
        state: order.3,
        item_total: order.4,
        shipment_total: order.5,
        tax_total,
        promo_total,
        total: order.6,
        item_count: order.7,
        adjustment_total: order.8,
        payment_state: order.9,
        shipment_state: order.10,
        completed_at: order.13,
        created_at: order.14,
        line_items,
        ship_address,
        bill_address: None, // Simplified
        shipment,
        adjustments,
        payments: get_order_payments(conn, order_id).unwrap_or_default(),
    })
}

fn get_order_adjustments(conn: &Connection, order_id: i64) -> Result<Vec<AdjustmentDetail>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, label, amount, source_type, adjustable_type, included FROM adjustments WHERE order_id = ?1"
    ).map_err(|e| e.to_string())?;

    let adjustments = stmt.query_map((order_id,), |row| {
        Ok(AdjustmentDetail {
            id: row.get(0)?,
            label: row.get(1)?,
            amount: row.get(2)?,
            source_type: row.get(3)?,
            adjustable_type: row.get(4)?,
            included: row.get::<_, i64>(5)? == 1,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(adjustments)
}

fn get_order_payments(conn: &Connection, order_id: i64) -> Result<Vec<PaymentDetail>, String> {
    let mut stmt = conn.prepare(
        r#"SELECT p.id, p.amount, p.state, pm.name, p.created_at
           FROM payments p
           JOIN payment_methods pm ON pm.id = p.payment_method_id
           WHERE p.order_id = ?1"#
    ).map_err(|e| e.to_string())?;

    let payments = stmt.query_map((order_id,), |row| {
        Ok(PaymentDetail {
            id: row.get(0)?,
            amount: row.get(1)?,
            state: row.get(2)?,
            payment_method_name: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(payments)
}

#[ic_cdk::query]
fn get_payment_methods() -> Result<Vec<PaymentMethod>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, type, description, active, auto_capture, position, test_mode, publishable_key, api_key
             FROM payment_methods WHERE active = 1 AND available_to_users = 1 ORDER BY position ASC"
        ).map_err(|e| e.to_string())?;

        let methods = stmt.query_map([], |row| {
            let api_key: Option<String> = row.get(9)?;
            let api_key_set = api_key.map(|k| !k.is_empty()).unwrap_or(false);
            Ok(PaymentMethod {
                id: row.get(0)?,
                name: row.get(1)?,
                method_type: row.get(2)?,
                description: row.get(3)?,
                active: row.get::<_, i64>(4)? == 1,
                auto_capture: row.get::<_, i64>(5)? == 1,
                position: row.get(6)?,
                available_to_users: true,
                available_to_admin: true,
                test_mode: Some(row.get::<_, i64>(7)? == 1),
                api_key_set,
                publishable_key: row.get(8)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        Ok(methods)
    })
}

#[ic_cdk::query]
fn admin_get_payment_methods() -> Result<Vec<PaymentMethod>, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, type, description, active, auto_capture, position, test_mode, publishable_key, api_key
             FROM payment_methods ORDER BY position ASC"
        ).map_err(|e| e.to_string())?;

        let methods = stmt.query_map([], |row| {
            let api_key: Option<String> = row.get(9)?;
            let api_key_set = api_key.map(|k| !k.is_empty()).unwrap_or(false);
            Ok(PaymentMethod {
                id: row.get(0)?,
                name: row.get(1)?,
                method_type: row.get(2)?,
                description: row.get(3)?,
                active: row.get::<_, i64>(4)? == 1,
                auto_capture: row.get::<_, i64>(5)? == 1,
                position: row.get(6)?,
                available_to_users: true,
                available_to_admin: true,
                test_mode: Some(row.get::<_, i64>(7)? == 1),
                api_key_set,
                publishable_key: row.get(8)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        Ok(methods)
    })
}

#[ic_cdk::update]
fn admin_update_payment_method(id: i64, input: UpdatePaymentMethodInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        if let Some(name) = input.name {
            conn.execute("UPDATE payment_methods SET name = ?1, updated_at = ?2 WHERE id = ?3", (name, now, id)).ok();
        }
        if let Some(active) = input.active {
            conn.execute("UPDATE payment_methods SET active = ?1, updated_at = ?2 WHERE id = ?3", (if active { 1 } else { 0 }, now, id)).ok();
        }
        if let Some(test_mode) = input.test_mode {
            conn.execute("UPDATE payment_methods SET test_mode = ?1, updated_at = ?2 WHERE id = ?3", (if test_mode { 1 } else { 0 }, now, id)).ok();
        }
        if let Some(api_key) = input.api_key {
            conn.execute("UPDATE payment_methods SET api_key = ?1, updated_at = ?2 WHERE id = ?3", (api_key, now, id)).ok();
        }
        if let Some(publishable_key) = input.publishable_key {
            conn.execute("UPDATE payment_methods SET publishable_key = ?1, updated_at = ?2 WHERE id = ?3", (publishable_key, now, id)).ok();
        }
        if let Some(webhook_secret) = input.webhook_secret {
            conn.execute("UPDATE payment_methods SET webhook_secret = ?1, updated_at = ?2 WHERE id = ?3", (webhook_secret, now, id)).ok();
        }
        Ok(())
    })
}

// ============================================
// ADMIN: USERS
// ============================================

#[ic_cdk::query]
fn admin_get_users(params: UserQueryParams) -> Result<UserListResponse, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let limit = params.per_page.unwrap_or(20);
        let offset = (params.page.unwrap_or(1) - 1) * limit;

        // Escape SQL LIKE wildcards to prevent query slowdown attacks
        let search_pattern = params.q.as_ref().map(|q| {
            let escaped = q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
            format!("%{}%", escaped)
        });

        let (query, count_query) = match (&search_pattern, &params.role) {
            (Some(_), Some(_)) => (
                format!("SELECT id, principal, email, role, created_at FROM users WHERE (principal LIKE ?1 ESCAPE '\\' OR email LIKE ?1 ESCAPE '\\') AND role = ?2 ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset),
                "SELECT COUNT(*) FROM users WHERE (principal LIKE ?1 ESCAPE '\\' OR email LIKE ?1 ESCAPE '\\') AND role = ?2".to_string()
            ),
            (Some(_), None) => (
                format!("SELECT id, principal, email, role, created_at FROM users WHERE (principal LIKE ?1 ESCAPE '\\' OR email LIKE ?1 ESCAPE '\\') ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset),
                "SELECT COUNT(*) FROM users WHERE (principal LIKE ?1 ESCAPE '\\' OR email LIKE ?1 ESCAPE '\\')".to_string()
            ),
            (None, Some(_)) => (
                format!("SELECT id, principal, email, role, created_at FROM users WHERE role = ?1 ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset),
                "SELECT COUNT(*) FROM users WHERE role = ?1".to_string()
            ),
            (None, None) => (
                format!("SELECT id, principal, email, role, created_at FROM users ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset),
                "SELECT COUNT(*) FROM users".to_string()
            ),
        };

        let total_count: i64 = match (&search_pattern, &params.role) {
            (Some(pattern), Some(role)) => conn.query_row(&count_query, (pattern, role), |row| row.get(0)).unwrap_or(0),
            (Some(pattern), None) => conn.query_row(&count_query, (pattern,), |row| row.get(0)).unwrap_or(0),
            (None, Some(role)) => conn.query_row(&count_query, (role,), |row| row.get(0)).unwrap_or(0),
            (None, None) => conn.query_row(&count_query, [], |row| row.get(0)).unwrap_or(0),
        };

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

        // Execute query with appropriate parameters
        let rows: Vec<(i64, String, Option<String>, String, i64)> = match (&search_pattern, &params.role) {
            (Some(pattern), Some(role)) => {
                stmt.query_map((pattern, role), |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
            },
            (Some(pattern), None) => {
                stmt.query_map((pattern,), |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
            },
            (None, Some(role)) => {
                stmt.query_map((role,), |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
            },
            (None, None) => {
                stmt.query_map([], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
                }).map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
            },
        };

        let users: Vec<UserDetail> = rows.into_iter().map(|(user_id, principal, email, role, created_at)| {
            // Get order count and total spent
            let (order_count, total_spent): (i64, i64) = conn.query_row(
                "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE user_id = ?1",
                (user_id,),
                |orow| Ok((orow.get(0)?, orow.get(1)?))
            ).unwrap_or((0, 0));

            UserDetail {
                id: user_id,
                principal,
                email,
                role: role.clone(),
                roles: vec![role],
                permissions: vec![],
                created_at,
                order_count,
                total_spent,
            }
        }).collect();

        Ok(UserListResponse {
            users,
            total_count,
            page: params.page.unwrap_or(1),
            per_page: limit,
            total_pages: (total_count as f64 / limit as f64).ceil() as i64,
        })
    })
}

#[ic_cdk::query]
fn admin_get_customers(params: CustomerQueryParams) -> Result<CustomerListResponse, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let limit = params.per_page.unwrap_or(50);
        let page = params.page.unwrap_or(1);
        let offset = (page - 1) * limit;

        // Escape SQL LIKE wildcards to prevent query slowdown attacks
        let search_pattern = params.q.as_ref().map(|q| {
            let escaped = q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
            format!("%{}%", escaped)
        });
        let has_search = search_pattern.is_some();
        let customer_type_filter = params.customer_type.as_deref();

        // Build the base WHERE clause based on customer_type filter
        let type_clause = match customer_type_filter {
            Some("registered") => " AND o.user_id IS NOT NULL",
            Some("guest") => " AND o.user_id IS NULL",
            _ => "",
        };

        // Build queries based on whether search is present
        let (count_sql, data_sql) = if has_search {
            (
                format!(
                    "SELECT COUNT(DISTINCT o.email) FROM orders o WHERE o.email IS NOT NULL AND o.email != '' AND o.email LIKE ?1 ESCAPE '\\'{}",
                    type_clause
                ),
                format!(
                    r#"SELECT
                        o.email,
                        CASE WHEN MAX(o.user_id) IS NOT NULL THEN 'registered' ELSE 'guest' END as customer_type,
                        MAX(u.principal) as principal,
                        COUNT(*) as order_count,
                        COALESCE(SUM(o.total), 0) as total_spent,
                        MIN(o.created_at) as first_order_at,
                        MAX(o.created_at) as last_order_at
                       FROM orders o
                       LEFT JOIN users u ON o.user_id = u.id
                       WHERE o.email IS NOT NULL AND o.email != '' AND o.email LIKE ?1 ESCAPE '\\'{}
                       GROUP BY o.email
                       ORDER BY last_order_at DESC
                       LIMIT {} OFFSET {}"#,
                    type_clause, limit, offset
                )
            )
        } else {
            (
                format!(
                    "SELECT COUNT(DISTINCT o.email) FROM orders o WHERE o.email IS NOT NULL AND o.email != ''{}",
                    type_clause
                ),
                format!(
                    r#"SELECT
                        o.email,
                        CASE WHEN MAX(o.user_id) IS NOT NULL THEN 'registered' ELSE 'guest' END as customer_type,
                        MAX(u.principal) as principal,
                        COUNT(*) as order_count,
                        COALESCE(SUM(o.total), 0) as total_spent,
                        MIN(o.created_at) as first_order_at,
                        MAX(o.created_at) as last_order_at
                       FROM orders o
                       LEFT JOIN users u ON o.user_id = u.id
                       WHERE o.email IS NOT NULL AND o.email != ''{}
                       GROUP BY o.email
                       ORDER BY last_order_at DESC
                       LIMIT {} OFFSET {}"#,
                    type_clause, limit, offset
                )
            )
        };

        // Execute count query with proper parameters
        let total_count: i64 = if let Some(ref pattern) = search_pattern {
            conn.query_row(&count_sql, (pattern,), |row| row.get(0)).unwrap_or(0)
        } else {
            conn.query_row(&count_sql, [], |row| row.get(0)).unwrap_or(0)
        };

        // Execute data query with proper parameters
        let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
        let mut id_counter = offset;

        let customers: Vec<CustomerSummary> = if let Some(ref pattern) = search_pattern {
            stmt.query_map((pattern,), |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i64>(5)?,
                    row.get::<_, i64>(6)?,
                ))
            }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
        } else {
            stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i64>(5)?,
                    row.get::<_, i64>(6)?,
                ))
            }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
        }.into_iter().map(|(email, customer_type, principal, order_count, total_spent, first_order_at, last_order_at)| {
            id_counter += 1;
            CustomerSummary {
                id: id_counter,
                email,
                customer_type,
                principal,
                order_count,
                total_spent,
                first_order_at,
                last_order_at,
            }
        }).collect();

        Ok(CustomerListResponse {
            customers,
            total_count,
            page,
            per_page: limit,
            total_pages: (total_count as f64 / limit as f64).ceil() as i64,
        })
    })
}

#[ic_cdk::query]
fn admin_get_user(id: i64) -> Result<UserDetail, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let (order_count, total_spent): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM orders WHERE user_id = ?1",
            (id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).unwrap_or((0, 0));

        let mut user = conn.query_row(
            "SELECT id, principal, email, role, created_at FROM users WHERE id = ?1",
            (id,),
            |row| Ok(UserDetail {
                id: row.get(0)?,
                principal: row.get(1)?,
                email: row.get(2)?,
                role: row.get(3)?,
                roles: vec![],
                permissions: vec![],
                created_at: row.get(4)?,
                order_count,
                total_spent,
            })
        ).map_err(|_| "User not found".to_string())?;

        // Get roles
        let mut stmt = conn.prepare(
            "SELECT r.name FROM roles r JOIN role_users ru ON ru.role_id = r.id WHERE ru.user_id = ?1"
        ).map_err(|e| e.to_string())?;
        
        user.roles = stmt.query_map((id,), |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<String>>>().map_err(|e| e.to_string())?;

        // Get permissions
        let mut stmt = conn.prepare(
            r#"SELECT DISTINCT ps.name 
               FROM permission_sets ps
               JOIN role_permission_sets rps ON rps.permission_set_id = ps.id
               JOIN role_users ru ON ru.role_id = rps.role_id
               WHERE ru.user_id = ?1"#
        ).map_err(|e| e.to_string())?;

        user.permissions = stmt.query_map((id,), |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<ic_rusqlite::Result<Vec<String>>>().map_err(|e| e.to_string())?;

        Ok(user)
    })
}

#[ic_cdk::update]
fn admin_update_user(id: i64, input: UpdateUserInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        if let Some(email) = input.email {
            conn.execute("UPDATE users SET email = ?1, updated_at = ?2 WHERE id = ?3", (&email, now, id))
                .map_err(|e| e.to_string())?;
        }

        if let Some(role) = input.role {
            conn.execute("UPDATE users SET role = ?1, updated_at = ?2 WHERE id = ?3", (&role, now, id))
                .map_err(|e| e.to_string())?;
        }

        if let Some(roles) = input.roles {
            // Clear existing roles
            conn.execute("DELETE FROM role_users WHERE user_id = ?1", (id,))
                .map_err(|e| e.to_string())?;
            
            // Add new roles
            for role_name in roles {
                let role_id: i64 = conn.query_row(
                    "SELECT id FROM roles WHERE name = ?1",
                    (&role_name,),
                    |row| row.get(0)
                ).map_err(|_| format!("Role {} not found", role_name))?;

                conn.execute(
                    "INSERT INTO role_users (role_id, user_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
                    (role_id, id, now)
                ).map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    })
}

#[ic_cdk::query]
fn get_refund_reasons() -> Result<Vec<RefundReason>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT id, name, active FROM refund_reasons WHERE active = 1")
            .map_err(|e| e.to_string())?;
        
        let reasons = stmt.query_map([], |row| {
            Ok(RefundReason {
                id: row.get(0)?,
                name: row.get(1)?,
                active: row.get::<_, i64>(2)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        
        Ok(reasons)
    })
}

#[ic_cdk::update]
fn admin_create_refund(input: CreateRefundInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();

        // Verify payment
        let (payment_amount, order_id): (i64, i64) = conn.query_row(
            "SELECT amount, order_id FROM payments WHERE id = ?1",
            (input.payment_id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "Payment not found".to_string())?;

        if input.amount > payment_amount {
            return Err("Refund amount cannot exceed payment amount".to_string());
        }

        // Create refund
        let refund_id: i64 = conn.query_row(
            r#"INSERT INTO refunds (payment_id, amount, refund_reason_id, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id"#,
            (input.payment_id, input.amount, input.reason_id, now),
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        // Update order payment state if fully refunded
        let total_refunded: i64 = conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE payment_id = ?1",
            (input.payment_id,),
            |row| row.get(0)
        ).unwrap_or(0);

        if total_refunded >= payment_amount {
            conn.execute(
                "UPDATE orders SET payment_state = 'void', updated_at = ?1 WHERE id = ?2",
                (now, order_id)
            ).ok();
            conn.execute(
                "UPDATE payments SET state = 'void', updated_at = ?1 WHERE id = ?2",
                (now, input.payment_id)
            ).ok();
        } else {
             conn.execute(
                "UPDATE orders SET payment_state = 'credit_owed', updated_at = ?1 WHERE id = ?2",
                (now, order_id)
            ).ok();
        }
        
        Ok(refund_id)
    })
}

// ============================================
// STRIPE INTEGRATION
// ============================================

/// Simple payment intent creation - just takes an amount in cents
/// This is the simpler approach used for single-page checkout
#[ic_cdk::update]
async fn create_payment_intent(amount: i64) -> Result<String, String> {
    // Get Stripe API key from database
    let api_key = with_connection(|conn| {
        conn.query_row(
            "SELECT api_key FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get::<_, Option<String>>(0)
        ).map_err(|_| "Stripe payment method not configured or active".to_string())?
        .ok_or("Stripe API key not configured".to_string())
    })?;

    // Make HTTP outcall to Stripe API
    let body = format!(
        "amount={}&currency=usd&automatic_payment_methods[enabled]=true",
        amount
    );

    let request = CanisterHttpRequestArgument {
        url: "https://api.stripe.com/v1/payment_intents".to_string(),
        max_response_bytes: Some(10000),
        method: HttpMethod::POST,
        headers: vec![
            HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", api_key),
            },
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/x-www-form-urlencoded".to_string(),
            },
        ],
        body: Some(body.into_bytes()),
        transform: None,
    };

    let cycles: u128 = 2_000_000_000;
    let (response,) = http_request(request, cycles).await.map_err(|(code, msg)| {
        format!("HTTP request failed: {:?} - {}", code, msg)
    })?;

    if response.status != 200u64 {
        let body_text = String::from_utf8_lossy(&response.body);
        return Err(format!("Stripe API error ({}): {}", response.status, body_text));
    }

    // Parse client_secret from response
    let body_text = String::from_utf8_lossy(&response.body);
    let client_secret = extract_json_string(&body_text, "client_secret")
        .ok_or_else(|| format!("Could not parse client_secret from Stripe response: {}", &body_text[..body_text.len().min(200)]))?;

    Ok(client_secret)
}

#[ic_cdk::update]
async fn create_stripe_payment_intent(order_id: i64, session_id: Option<String>) -> Result<String, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };
    // Check admin BEFORE entering with_connection to avoid nested borrow
    let is_admin_user = is_admin();

    // Step 1: Get order details, check for existing intent, and get Stripe API key
    let (total, payment_method_id, api_key, existing_intent) = with_connection(|conn| {
        // Verify order exists and belongs to the caller (or guest with session) or they are admin
        let (total, state, _order_number): (i64, String, String) = if is_anonymous {
            if let Some(sess_id) = &session_id {
                conn.query_row(
                    "SELECT total, state, number FROM orders WHERE id = ?1 AND guest_token = ?2",
                    (order_id, sess_id),
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                ).map_err(|_| "Order not found or access denied".to_string())?
            } else {
                return Err("Session ID required for guest checkout".to_string());
            }
        } else {
            conn.query_row(
                "SELECT total, state, number FROM orders WHERE id = ?1 AND (user_principal = ?2 OR user_id = ?3 OR 1=?4)",
                (order_id, &caller_str, user_id, if is_admin_user { 1 } else { 0 }),
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            ).map_err(|_| "Order not found or access denied".to_string())?
        };

        if state != "cart" && state != "address" && state != "delivery" && state != "payment" {
            return Err(format!("Order is in state '{}' and cannot be paid", state));
        }

        // IDEMPOTENCY: Check if we already have a valid PaymentIntent for this order
        // If so, return it instead of creating a new one
        let existing: Option<(String, i64)> = conn.query_row(
            r#"SELECT client_secret, amount FROM payment_intents
               WHERE order_id = ?1 AND status NOT IN ('succeeded', 'canceled')
               ORDER BY created_at DESC LIMIT 1"#,
            (order_id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).ok();

        // If existing intent has same amount, reuse it
        if let Some((client_secret, intent_amount)) = existing {
            if intent_amount == total {
                // Return existing intent - no need to create new one
                return Ok((total, 0i64, String::new(), Some(client_secret)));
            }
            // Amount changed - we'll need to create a new intent
            // (Could also update the existing intent via Stripe API, but creating new is safer)
        }

        // Find the active Stripe payment method and get API key
        let (payment_method_id, api_key): (i64, Option<String>) = conn.query_row(
            "SELECT id, api_key FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "Stripe payment method not configured or active".to_string())?;

        let api_key = api_key.ok_or("Stripe API key not configured")?;

        Ok((total, payment_method_id, api_key, None))
    })?;

    // If we found an existing valid intent, return it immediately
    if let Some(client_secret) = existing_intent {
        return Ok(client_secret);
    }

    // Validate amount is positive (Stripe requires minimum 50 cents for USD)
    if total <= 0 {
        return Err("Order total must be positive".to_string());
    }
    if total < 50 {
        return Err("Order total must be at least $0.50 USD for Stripe payments".to_string());
    }

    // Generate idempotency key based on order_id and amount
    // This ensures Stripe won't create duplicates if our call is retried
    let idempotency_key = format!("order_{}_amount_{}", order_id, total);

    // Step 2: Make HTTP outcall to Stripe API with idempotency key
    let body = format!(
        "amount={}&currency=usd&automatic_payment_methods[enabled]=true&metadata[order_id]={}",
        total, order_id
    );

    let request = CanisterHttpRequestArgument {
        url: "https://api.stripe.com/v1/payment_intents".to_string(),
        max_response_bytes: Some(10000),
        method: HttpMethod::POST,
        headers: vec![
            HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", api_key),
            },
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/x-www-form-urlencoded".to_string(),
            },
            HttpHeader {
                name: "Idempotency-Key".to_string(),
                value: idempotency_key,
            },
        ],
        body: Some(body.into_bytes()),
        transform: None,
    };

    // HTTP outcalls require cycles (about 2 billion)
    let cycles: u128 = 2_000_000_000;
    let (response,) = http_request(request, cycles).await.map_err(|(code, msg)| {
        format!("HTTP request failed: {:?} - {}", code, msg)
    })?;

    if response.status != 200u64 {
        let body_text = String::from_utf8_lossy(&response.body);
        return Err(format!("Stripe API error ({}): {}", response.status, body_text));
    }

    // Step 3: Parse the response to extract client_secret and id
    let body_text = String::from_utf8_lossy(&response.body);
    let (intent_id, client_secret) = parse_stripe_payment_intent(&body_text)?;

    // Step 4: Store the payment intent in database
    // Use INSERT OR REPLACE to handle race conditions
    with_connection(|conn| {
        let now = now();
        conn.execute(
            r#"INSERT OR REPLACE INTO payment_intents (order_id, payment_method_id, stripe_intent_id, client_secret, amount, status, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, 'requires_payment_method', ?6, ?6)"#,
            (order_id, payment_method_id, &intent_id, &client_secret, total, now)
        ).map_err(|e| e.to_string())?;

        Ok(client_secret)
    })
}

// Helper function to parse Stripe PaymentIntent response using serde_json
fn parse_stripe_payment_intent(json: &str) -> Result<(String, String), String> {
    let parsed: serde_json::Value = serde_json::from_str(json)
        .map_err(|e| format!("Failed to parse Stripe response as JSON: {}", e))?;

    let id = parsed.get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Missing 'id' in Stripe response: {}", &json[..json.len().min(500)]))?
        .to_string();

    let client_secret = parsed.get("client_secret")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Missing 'client_secret' in Stripe response: {}", &json[..json.len().min(500)]))?
        .to_string();

    Ok((id, client_secret))
}

// Helper to extract a string value from JSON using serde_json
fn extract_json_string(json: &str, key: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(json)
        .ok()
        .and_then(|v| v.get(key)?.as_str().map(|s| s.to_string()))
}

// URL encode helper for Stripe API
fn url_encode(text: &str) -> String {
    let mut result = String::new();
    for c in text.chars() {
        match c {
            ' ' => result.push_str("%20"),
            '&' => result.push_str("%26"),
            '=' => result.push_str("%3D"),
            '?' => result.push_str("%3F"),
            '#' => result.push_str("%23"),
            '+' => result.push_str("%2B"),
            _ => result.push(c),
        }
    }
    result
}

/// Create a Stripe Checkout Session and return the redirect URL
/// This is the recommended approach for a single-page checkout experience
#[ic_cdk::update]
async fn create_stripe_checkout_session(
    order_id: i64,
    success_url: String,
    cancel_url: String,
    session_id: Option<String>
) -> Result<String, String> {
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };
    // Check admin BEFORE entering with_connection to avoid nested borrow
    let is_admin_user = is_admin();

    // Step 1: Get order details, check for existing session, and get Stripe API key
    let (order_number, line_items, api_key, email, existing_session) = with_connection(|conn| {
        // Verify order exists and get details
        let (order_number, state, email, _total): (String, String, Option<String>, i64) = if is_anonymous {
            if let Some(sess_id) = &session_id {
                conn.query_row(
                    "SELECT number, state, email, total FROM orders WHERE id = ?1 AND guest_token = ?2",
                    (order_id, sess_id),
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                ).map_err(|_| "Order not found or access denied".to_string())?
            } else {
                return Err("Session ID required for guest checkout".to_string());
            }
        } else {
            conn.query_row(
                "SELECT number, state, email, total FROM orders WHERE id = ?1 AND (user_principal = ?2 OR user_id = ?3 OR 1=?4)",
                (order_id, &caller_str, user_id, if is_admin_user { 1 } else { 0 }),
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            ).map_err(|_| "Order not found or access denied".to_string())?
        };

        if state != "cart" && state != "address" && state != "delivery" && state != "payment" {
            return Err(format!("Order is in state '{}' and cannot be paid", state));
        }

        // IDEMPOTENCY: Check if we already have a valid checkout session for this order
        let existing: Option<String> = conn.query_row(
            r#"SELECT client_secret FROM payment_intents
               WHERE order_id = ?1 AND status = 'checkout_session'
               ORDER BY created_at DESC LIMIT 1"#,
            (order_id,),
            |row| row.get(0)
        ).ok();

        // If we have an existing checkout session URL, return it
        if let Some(url) = existing {
            if !url.is_empty() {
                return Ok((order_number, vec![], String::new(), email, Some(url)));
            }
        }

        // Get line items
        let mut stmt = conn.prepare(
            r#"SELECT li.quantity, li.price, p.name
               FROM line_items li
               JOIN variants v ON v.id = li.variant_id
               JOIN products p ON p.id = v.product_id
               WHERE li.order_id = ?1"#
        ).map_err(|e| e.to_string())?;

        let items: Vec<(i64, i64, String)> = stmt.query_map((order_id,), |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

        // Get Stripe API key
        let api_key: Option<String> = conn.query_row(
            "SELECT api_key FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get(0)
        ).map_err(|_| "Stripe payment method not configured or active".to_string())?;

        let api_key = api_key.ok_or("Stripe API key not configured")?;

        Ok((order_number, items, api_key, email, None))
    })?;

    // If we found an existing valid checkout session, return it immediately
    if let Some(checkout_url) = existing_session {
        return Ok(checkout_url);
    }

    // Validate we have line items and all prices are positive
    if line_items.is_empty() {
        return Err("Order has no items".to_string());
    }
    for (quantity, price, name) in &line_items {
        if *price <= 0 {
            return Err(format!("Invalid price for item '{}': must be positive", name));
        }
        if *quantity <= 0 {
            return Err(format!("Invalid quantity for item '{}': must be positive", name));
        }
        // Stripe minimum is 50 cents per line item
        if *price < 50 {
            return Err(format!("Price for '{}' must be at least $0.50 USD", name));
        }
    }

    // Step 2: Build the request body for Stripe Checkout Session
    let mut body_parts: Vec<String> = vec![
        "mode=payment".to_string(),
        format!("success_url={}", url_encode(&success_url)),
        format!("cancel_url={}", url_encode(&cancel_url)),
        format!("client_reference_id={}", order_number),
    ];

    // Add customer email if available
    if let Some(email_addr) = email {
        body_parts.push(format!("customer_email={}", url_encode(&email_addr)));
    }

    // Add line items
    for (i, (quantity, price, name)) in line_items.iter().enumerate() {
        let prefix = format!("line_items[{}]", i);
        body_parts.push(format!("{}[price_data][currency]=usd", prefix));
        body_parts.push(format!("{}[price_data][unit_amount]={}", prefix, price));
        body_parts.push(format!("{}[price_data][product_data][name]={}", prefix, url_encode(name)));
        body_parts.push(format!("{}[quantity]={}", prefix, quantity));
    }

    let body = body_parts.join("&");

    // Generate idempotency key based on order_number
    // This ensures Stripe won't create duplicate checkout sessions if our call is retried
    let idempotency_key = format!("checkout_{}", order_number);

    // Step 3: Make HTTP outcall to Stripe API with idempotency key
    let request = CanisterHttpRequestArgument {
        url: "https://api.stripe.com/v1/checkout/sessions".to_string(),
        max_response_bytes: Some(15000),
        method: HttpMethod::POST,
        headers: vec![
            HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", api_key),
            },
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/x-www-form-urlencoded".to_string(),
            },
            HttpHeader {
                name: "Idempotency-Key".to_string(),
                value: idempotency_key,
            },
        ],
        body: Some(body.into_bytes()),
        transform: None,
    };

    let cycles: u128 = 2_000_000_000;
    let (response,) = http_request(request, cycles).await.map_err(|(code, msg)| {
        format!("HTTP request failed: {:?} - {}", code, msg)
    })?;

    if response.status != 200u64 {
        let body_text = String::from_utf8_lossy(&response.body);
        return Err(format!("Stripe API error ({}): {}", response.status, body_text));
    }

    // Step 4: Parse the response to get the checkout URL
    let body_text = String::from_utf8_lossy(&response.body);
    let checkout_url = extract_json_string(&body_text, "url")
        .ok_or("Could not parse checkout URL from Stripe response")?;
    
    let session_stripe_id = extract_json_string(&body_text, "id")
        .ok_or("Could not parse session ID from Stripe response")?;

    // Step 5: Store the checkout session in database
    with_connection(|conn| {
        let now = now();
        let payment_method_id: i64 = conn.query_row(
            "SELECT id FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get(0)
        ).unwrap_or(1);

        conn.execute(
            r#"INSERT INTO payment_intents (order_id, payment_method_id, stripe_intent_id, client_secret, amount, status, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, 0, 'checkout_session', ?5, ?5)"#,
            (order_id, payment_method_id, &session_stripe_id, &checkout_url, now)
        ).ok(); // Ignore errors if already exists

        // Move order to payment state
        conn.execute(
            "UPDATE orders SET state = 'payment', updated_at = ?1 WHERE id = ?2",
            (now, order_id)
        ).ok();

        Ok(checkout_url)
    })
}

/// Verify and record a Stripe payment by checking with Stripe API
/// This is secure for mainnet - we verify the payment status directly with Stripe
#[ic_cdk::update]
async fn record_stripe_payment(order_id: i64, payment_intent_id: String, _status: String, session_id: Option<String>) -> Result<(), String> {
    // Step 1: Get Stripe API key from database
    let api_key: String = with_connection(|conn| {
        conn.query_row(
            "SELECT api_key FROM payment_methods WHERE type = 'stripe' AND active = 1 AND api_key IS NOT NULL LIMIT 1",
            [],
            |row| row.get(0)
        ).map_err(|_| "Stripe API key not configured".to_string())
    })?;

    // Step 2: Verify order ownership
    let caller = ic_cdk::api::caller();
    let caller_str = caller.to_string();
    let is_anonymous = caller == Principal::anonymous();
    let user_id = if !is_anonymous { get_current_user_id() } else { None };

    let order_check = with_connection(|conn| {
        let order_owner_check: bool = if is_anonymous {
            if let Some(ref sess_id) = session_id {
                conn.query_row(
                    "SELECT 1 FROM orders WHERE id = ?1 AND guest_token = ?2",
                    (order_id, sess_id),
                    |_| Ok(true)
                ).unwrap_or(false)
            } else {
                false
            }
        } else {
            conn.query_row(
                "SELECT 1 FROM orders WHERE id = ?1 AND (user_id = ?2 OR user_principal = ?3)",
                (order_id, user_id, &caller_str),
                |_| Ok(true)
            ).unwrap_or(false)
        };

        if !order_owner_check && !is_admin() {
            return Err("Unauthorized: Order does not belong to you".to_string());
        }

        // Verify order exists and get expected amount
        let order_data: (i64, String) = conn.query_row(
            "SELECT total, number FROM orders WHERE id = ?1",
            (order_id,),
            |row| Ok((row.get(0)?, row.get(1)?))
        ).map_err(|_| "Order not found".to_string())?;

        Ok(order_data)
    })?;

    let (expected_amount, order_number) = order_check;

    // Step 3: Verify payment with Stripe API
    // Determine if this is a checkout session or payment intent
    let is_session = payment_intent_id.starts_with("cs_");
    let stripe_url = if is_session {
        format!("https://api.stripe.com/v1/checkout/sessions/{}", payment_intent_id)
    } else {
        format!("https://api.stripe.com/v1/payment_intents/{}", payment_intent_id)
    };

    let request_headers = vec![
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", api_key) },
    ];

    let request = CanisterHttpRequestArgument {
        url: stripe_url,
        method: HttpMethod::GET,
        headers: request_headers,
        body: None,
        max_response_bytes: Some(10000),
        transform: None,
    };

    let (response,) = http_request(request, 2_000_000_000).await.map_err(|(code, msg)| {
        format!("HTTP request failed: {:?} - {}", code, msg)
    })?;

    if response.status != 200u64 {
        return Err(format!("Stripe API error: status {}", response.status));
    }

    let body_str = String::from_utf8(response.body)
        .map_err(|_| "Invalid response from Stripe")?;

    let stripe_data: serde_json::Value = serde_json::from_str(&body_str)
        .map_err(|_| "Failed to parse Stripe response")?;

    // Step 4: Verify payment status and amount
    let (verified_status, verified_amount, metadata_order_number) = if is_session {
        // For checkout sessions
        let status = stripe_data["payment_status"].as_str().unwrap_or("");
        let amount = stripe_data["amount_total"].as_i64().unwrap_or(0);
        let meta_order = stripe_data["metadata"]["order_number"].as_str().map(|s| s.to_string());
        (status == "paid", amount, meta_order)
    } else {
        // For payment intents
        let status = stripe_data["status"].as_str().unwrap_or("");
        let amount = stripe_data["amount"].as_i64().unwrap_or(0);
        let meta_order = stripe_data["metadata"]["order_number"].as_str().map(|s| s.to_string());
        (status == "succeeded", amount, meta_order)
    };

    // Verify amount matches (within 1 cent tolerance for rounding)
    if (verified_amount - expected_amount).abs() > 1 {
        return Err(format!("Amount mismatch: expected {}, got {}", expected_amount, verified_amount));
    }

    // Verify order number matches if present in metadata
    if let Some(ref meta_num) = metadata_order_number {
        if meta_num != &order_number {
            return Err("Order number mismatch".to_string());
        }
    }

    if !verified_status {
        return Err("Payment not completed".to_string());
    }

    // Step 5: Payment verified! Now complete the order
    with_connection(|conn| {
        let now = now();

        // Check if already processed
        let already_paid: bool = conn.query_row(
            "SELECT payment_state = 'paid' FROM orders WHERE id = ?1",
            (order_id,),
            |row| row.get(0)
        ).unwrap_or(false);

        if already_paid {
            return Ok::<(), String>(()); // Already processed, nothing to do
        }

        // Find payment method
        let payment_method_id: i64 = conn.query_row(
            "SELECT id FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get(0)
        ).map_err(|_| "Stripe payment method not configured".to_string())?;

        // Update the intent status
        conn.execute(
            "UPDATE payment_intents SET status = 'succeeded', updated_at = ?1 WHERE stripe_intent_id = ?2",
            (now, &payment_intent_id)
        ).ok();

        // Record the payment
        conn.execute(
            r#"INSERT OR IGNORE INTO payments (order_id, payment_method_id, amount, state, response_code, stripe_payment_intent_id, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'completed', ?4, ?4, ?5, ?5)"#,
            (order_id, payment_method_id, expected_amount, &payment_intent_id, now)
        ).ok();

        // Finalize order
        conn.execute(
            "UPDATE orders SET payment_state = 'paid', state = 'complete', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
            (now, order_id)
        ).ok();

        // Decrement stock for each line item
        let mut stmt = conn.prepare(
            "SELECT variant_id, quantity FROM line_items WHERE order_id = ?1"
        ).map_err(|e| e.to_string())?;

        let line_items: Vec<(i64, i64)> = stmt.query_map((order_id,), |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(stmt);

        for (variant_id, quantity) in line_items {
            conn.execute(
                "UPDATE stock_items SET count_on_hand = count_on_hand - ?1, updated_at = ?2 WHERE variant_id = ?3",
                (quantity, now, variant_id)
            ).ok();
        }

        Ok(())
    })?;

    // Step 6: Send confirmation email (async, after db transaction)
    let email_data = with_connection(|conn| {
        conn.query_row(
            r#"SELECT o.email, o.number, o.total,
               COALESCE(a.firstname || ' ' || a.lastname, 'Customer'),
               COALESCE(a.address1 || CHAR(10) || a.city || ', ' || COALESCE(a.state_name, '') || ' ' || a.zipcode, ''),
               GROUP_CONCAT(li.quantity || ' x ' || p.name || ' - $' || printf('%.2f', v.price / 100.0), CHAR(10))
               FROM orders o
               LEFT JOIN addresses a ON a.id = o.ship_address_id
               LEFT JOIN line_items li ON li.order_id = o.id
               LEFT JOIN variants v ON v.id = li.variant_id
               LEFT JOIN products p ON p.id = v.product_id
               WHERE o.id = ?1
               GROUP BY o.id"#,
            (order_id,),
            |row| Ok((
                row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            ))
        ).ok()
    });

    if let Some((email, order_number, total, customer_name, shipping_address, items_text)) = email_data {
        if !email.is_empty() {
            let _ = send_order_confirmation(email, order_number, total, customer_name, shipping_address, items_text).await;
        }
    }

    Ok(())
}

// ============================================
// STRIPE WEBHOOK - Production Payment Verification
// ============================================

/// Stripe webhook input - receives the raw payload and signature header
#[derive(CandidType, Deserialize)]
pub struct StripeWebhookInput {
    pub payload: String,
    pub stripe_signature: String,
}

/// Verify Stripe webhook signature using HMAC-SHA256
/// Stripe signature format: t=timestamp,v1=signature
fn verify_stripe_signature(payload: &str, signature_header: &str, webhook_secret: &str) -> Result<(), String> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    // Parse signature header: t=1234567890,v1=abc123...
    let mut timestamp: Option<&str> = None;
    let mut signature: Option<&str> = None;

    for part in signature_header.split(',') {
        if let Some(ts) = part.strip_prefix("t=") {
            timestamp = Some(ts);
        } else if let Some(sig) = part.strip_prefix("v1=") {
            signature = Some(sig);
        }
    }

    let timestamp = timestamp.ok_or("Missing timestamp in Stripe signature")?;
    let expected_sig = signature.ok_or("Missing v1 signature in Stripe signature")?;

    // Verify timestamp is not too old (5 minutes tolerance)
    let ts: i64 = timestamp.parse().map_err(|_| "Invalid timestamp")?;
    let current_time = (ic_cdk::api::time() / 1_000_000_000) as i64; // seconds
    if (current_time - ts).abs() > 300 {
        return Err("Webhook timestamp too old (possible replay attack)".to_string());
    }

    // Compute expected signature: HMAC-SHA256(timestamp + "." + payload, webhook_secret)
    let signed_payload = format!("{}.{}", timestamp, payload);

    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(webhook_secret.as_bytes())
        .map_err(|_| "Invalid webhook secret")?;
    mac.update(signed_payload.as_bytes());
    let computed_sig = hex::encode(mac.finalize().into_bytes());

    // Constant-time comparison to prevent timing attacks
    if computed_sig.len() != expected_sig.len() {
        return Err("Invalid webhook signature".to_string());
    }

    let matches = computed_sig.as_bytes().iter()
        .zip(expected_sig.as_bytes())
        .fold(0u8, |acc, (a, b)| acc | (a ^ b));

    if matches != 0 {
        return Err("Invalid webhook signature".to_string());
    }

    Ok(())
}

/// Handle Stripe webhook events
/// This endpoint verifies the signature and processes payment events
#[ic_cdk::update]
fn handle_stripe_webhook(input: StripeWebhookInput) -> Result<String, String> {
    // Step 1: Get webhook secret from database
    let webhook_secret: String = with_connection(|conn| {
        conn.query_row(
            "SELECT webhook_secret FROM payment_methods WHERE type = 'stripe' AND active = 1 AND webhook_secret IS NOT NULL LIMIT 1",
            [],
            |row| row.get(0)
        ).map_err(|_| "Stripe webhook secret not configured".to_string())
    })?;

    // Step 2: Verify signature
    verify_stripe_signature(&input.payload, &input.stripe_signature, &webhook_secret)?;

    // Step 3: Parse the event
    let event: serde_json::Value = serde_json::from_str(&input.payload)
        .map_err(|e| format!("Failed to parse webhook payload: {}", e))?;

    let event_type = event["type"].as_str()
        .ok_or("Missing event type")?;

    // Step 4: Handle the event
    match event_type {
        "payment_intent.succeeded" => {
            let payment_intent = &event["data"]["object"];
            let intent_id = payment_intent["id"].as_str()
                .ok_or("Missing payment intent ID")?;
            let amount = payment_intent["amount"].as_i64()
                .ok_or("Missing amount")?;
            let order_id = payment_intent["metadata"]["order_id"].as_str()
                .and_then(|s| s.parse::<i64>().ok());

            process_successful_payment(intent_id, amount, order_id)?;
            Ok(format!("Processed payment_intent.succeeded: {}", intent_id))
        },
        "checkout.session.completed" => {
            let session = &event["data"]["object"];
            let session_id = session["id"].as_str()
                .ok_or("Missing session ID")?;
            let payment_status = session["payment_status"].as_str()
                .unwrap_or("unpaid");
            let order_number = session["client_reference_id"].as_str();

            if payment_status == "paid" {
                process_checkout_session_completed(session_id, order_number)?;
                Ok(format!("Processed checkout.session.completed: {}", session_id))
            } else {
                Ok(format!("Checkout session {} not yet paid: {}", session_id, payment_status))
            }
        },
        "payment_intent.payment_failed" => {
            let payment_intent = &event["data"]["object"];
            let intent_id = payment_intent["id"].as_str()
                .ok_or("Missing payment intent ID")?;

            process_failed_payment(intent_id)?;
            Ok(format!("Processed payment_intent.payment_failed: {}", intent_id))
        },
        _ => {
            // Acknowledge but don't process unknown events
            Ok(format!("Ignored event type: {}", event_type))
        }
    }
}

/// Process a successful payment from webhook
fn process_successful_payment(intent_id: &str, amount: i64, order_id_meta: Option<i64>) -> Result<(), String> {
    with_connection(|conn| {
        let now = now();

        // Find order by intent_id in payment_intents table, or by metadata order_id
        let order_id: i64 = if let Some(oid) = order_id_meta {
            oid
        } else {
            conn.query_row(
                "SELECT order_id FROM payment_intents WHERE stripe_intent_id = ?1",
                (intent_id,),
                |row| row.get(0)
            ).map_err(|_| format!("Order not found for payment intent: {}", intent_id))?
        };

        // Check if already processed (idempotency)
        let already_paid: bool = conn.query_row(
            "SELECT payment_state = 'paid' FROM orders WHERE id = ?1",
            (order_id,),
            |row| row.get(0)
        ).unwrap_or(false);

        if already_paid {
            return Ok(()); // Already processed, skip
        }

        // Update payment intent status
        conn.execute(
            "UPDATE payment_intents SET status = 'succeeded', updated_at = ?1 WHERE stripe_intent_id = ?2",
            (now, intent_id)
        ).ok();

        // Get payment method ID
        let payment_method_id: i64 = conn.query_row(
            "SELECT id FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get(0)
        ).unwrap_or(1);

        // Record payment
        conn.execute(
            r#"INSERT OR IGNORE INTO payments (order_id, payment_method_id, amount, state, response_code, stripe_payment_intent_id, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'completed', ?4, ?4, ?5, ?5)"#,
            (order_id, payment_method_id, amount, intent_id, now)
        ).ok();

        // Finalize order
        conn.execute(
            "UPDATE orders SET payment_state = 'paid', state = 'complete', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
            (now, order_id)
        ).ok();

        // Decrement stock
        let mut stmt = conn.prepare(
            "SELECT variant_id, quantity FROM line_items WHERE order_id = ?1"
        ).map_err(|e| e.to_string())?;

        let line_items: Vec<(i64, i64)> = stmt.query_map((order_id,), |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(stmt);

        for (variant_id, quantity) in line_items {
            conn.execute(
                "UPDATE stock_items SET count_on_hand = count_on_hand - ?1, updated_at = ?2 WHERE variant_id = ?3",
                (quantity, now, variant_id)
            ).ok();
        }

        // Get order details for email
        let email_data: Option<(String, String, i64, String, String, String)> = conn.query_row(
            r#"SELECT o.email, o.number, o.total,
               COALESCE(a.firstname || ' ' || a.lastname, 'Customer'),
               COALESCE(a.address1 || CHAR(10) || a.city || ', ' || COALESCE(a.state_name, '') || ' ' || a.zipcode, ''),
               GROUP_CONCAT(li.quantity || ' x ' || p.name || ' - $' || printf('%.2f', v.price / 100.0), CHAR(10))
               FROM orders o
               LEFT JOIN addresses a ON a.id = o.ship_address_id
               LEFT JOIN line_items li ON li.order_id = o.id
               LEFT JOIN variants v ON v.id = li.variant_id
               LEFT JOIN products p ON p.id = v.product_id
               WHERE o.id = ?1
               GROUP BY o.id"#,
            (order_id,),
            |row| Ok((
                row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            ))
        ).ok();

        if let Some((email, order_number, total, customer_name, shipping_address, items_text)) = email_data {
            if !email.is_empty() {
                ic_cdk::spawn(async move {
                    let _ = send_order_confirmation(email, order_number, total, customer_name, shipping_address, items_text).await;
                });
            }
        }

        Ok(())
    })
}

/// Process a completed checkout session
fn process_checkout_session_completed(session_id: &str, order_number: Option<&str>) -> Result<(), String> {
    with_connection(|conn| {
        let now = now();

        // Find order by session_id or order_number
        let order_id: i64 = if let Some(num) = order_number {
            conn.query_row(
                "SELECT id FROM orders WHERE number = ?1",
                (num,),
                |row| row.get(0)
            ).map_err(|_| format!("Order not found: {}", num))?
        } else {
            conn.query_row(
                "SELECT order_id FROM payment_intents WHERE stripe_intent_id = ?1",
                (session_id,),
                |row| row.get(0)
            ).map_err(|_| format!("Order not found for session: {}", session_id))?
        };

        // Check if already processed
        let already_paid: bool = conn.query_row(
            "SELECT payment_state = 'paid' FROM orders WHERE id = ?1",
            (order_id,),
            |row| row.get(0)
        ).unwrap_or(false);

        if already_paid {
            return Ok(());
        }

        // Get order total
        let amount: i64 = conn.query_row(
            "SELECT total FROM orders WHERE id = ?1",
            (order_id,),
            |row| row.get(0)
        ).unwrap_or(0);

        // Update checkout session status
        conn.execute(
            "UPDATE payment_intents SET status = 'succeeded', updated_at = ?1 WHERE stripe_intent_id = ?2",
            (now, session_id)
        ).ok();

        // Get payment method ID
        let payment_method_id: i64 = conn.query_row(
            "SELECT id FROM payment_methods WHERE type = 'stripe' AND active = 1 LIMIT 1",
            [],
            |row| row.get(0)
        ).unwrap_or(1);

        // Record payment
        conn.execute(
            r#"INSERT OR IGNORE INTO payments (order_id, payment_method_id, amount, state, response_code, stripe_payment_intent_id, created_at, updated_at)
               VALUES (?1, ?2, ?3, 'completed', ?4, ?4, ?5, ?5)"#,
            (order_id, payment_method_id, amount, session_id, now)
        ).ok();

        // Finalize order
        conn.execute(
            "UPDATE orders SET payment_state = 'paid', state = 'complete', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
            (now, order_id)
        ).ok();

        // Decrement stock
        let mut stmt = conn.prepare(
            "SELECT variant_id, quantity FROM line_items WHERE order_id = ?1"
        ).map_err(|e| e.to_string())?;

        let line_items: Vec<(i64, i64)> = stmt.query_map((order_id,), |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(stmt);

        for (variant_id, quantity) in line_items {
            conn.execute(
                "UPDATE stock_items SET count_on_hand = count_on_hand - ?1, updated_at = ?2 WHERE variant_id = ?3",
                (quantity, now, variant_id)
            ).ok();
        }

        // Get order details for email
        let email_data: Option<(String, String, i64, String, String, String)> = conn.query_row(
            r#"SELECT o.email, o.number, o.total,
               COALESCE(a.firstname || ' ' || a.lastname, 'Customer'),
               COALESCE(a.address1 || CHAR(10) || a.city || ', ' || COALESCE(a.state_name, '') || ' ' || a.zipcode, ''),
               GROUP_CONCAT(li.quantity || ' x ' || p.name || ' - $' || printf('%.2f', v.price / 100.0), CHAR(10))
               FROM orders o
               LEFT JOIN addresses a ON a.id = o.ship_address_id
               LEFT JOIN line_items li ON li.order_id = o.id
               LEFT JOIN variants v ON v.id = li.variant_id
               LEFT JOIN products p ON p.id = v.product_id
               WHERE o.id = ?1
               GROUP BY o.id"#,
            (order_id,),
            |row| Ok((
                row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            ))
        ).ok();

        if let Some((email, order_number, total, customer_name, shipping_address, items_text)) = email_data {
            if !email.is_empty() {
                ic_cdk::spawn(async move {
                    let _ = send_order_confirmation(email, order_number, total, customer_name, shipping_address, items_text).await;
                });
            }
        }

        Ok(())
    })
}

/// Process a failed payment from webhook
fn process_failed_payment(intent_id: &str) -> Result<(), String> {
    with_connection(|conn| {
        let now = now();

        // Update payment intent status
        conn.execute(
            "UPDATE payment_intents SET status = 'failed', updated_at = ?1 WHERE stripe_intent_id = ?2",
            (now, intent_id)
        ).ok();

        Ok(())
    })
}

#[ic_cdk::query]
fn get_option_types() -> Result<Vec<OptionType>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, presentation, COALESCE(position, 0) FROM option_types ORDER BY position ASC"
        ).map_err(|e| e.to_string())?;

        let types = stmt.query_map([], |row| {
            Ok(OptionType {
                id: row.get(0)?,
                name: row.get(1)?,
                presentation: row.get(2)?,
                position: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;

        types.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    })
}

#[ic_cdk::update]
fn create_option_type(input: CreateOptionTypeInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        conn.execute(
            "INSERT INTO option_types (name, presentation, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            (&input.name, &input.presentation, now),
        ).map_err(|e| e.to_string())?;
        
        Ok(conn.last_insert_rowid())
    })
}

#[ic_cdk::update]
fn create_option_value(input: CreateOptionValueInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        conn.execute(
            "INSERT INTO option_values (option_type_id, name, presentation, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
            (input.option_type_id, &input.name, &input.presentation, now),
        ).map_err(|e| e.to_string())?;
        
        Ok(conn.last_insert_rowid())
    })
}

#[ic_cdk::update]
fn create_variant(input: CreateVariantInput) -> Result<i64, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        // 1. Create Variant
        conn.execute(
            "INSERT INTO variants (product_id, sku, cost_price, is_master, created_at, updated_at) VALUES (?1, ?2, ?3, 0, ?4, ?4)",
            (input.product_id, &input.sku, input.price, now), // Storing price in cost_price for now or create generic price logic? 
            // Database has 'prices' table. Using cost_price as base. 
            // Wait, schema has 'prices' table for amount. 'variants' has 'cost_price'.
            // Solidus uses 'prices' table for the selling price.
        ).map_err(|e| e.to_string())?;
        
        let variant_id = conn.last_insert_rowid();

        // 2. Create Price entry
        conn.execute(
            "INSERT INTO prices (variant_id, amount, currency, created_at, updated_at) VALUES (?1, ?2, 'USD', ?3, ?3)",
            (variant_id, input.price, now),
        ).map_err(|e| e.to_string())?;

        // 3. Create Stock Item (Inventory) - Assuming single default location (id=1)
        conn.execute(
             "INSERT INTO stock_items (stock_location_id, variant_id, count_on_hand, backorderable, created_at, updated_at) VALUES (1, ?1, ?2, 1, ?3, ?3)",
             (variant_id, input.stock, now)
        ).map_err(|e| e.to_string())?;

        // 4. Associate Option Values
        for ov_id in input.option_value_ids {
            conn.execute(
                "INSERT INTO option_values_variants (variant_id, option_value_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
                (variant_id, ov_id, now)
            ).map_err(|e| e.to_string())?;
        }
        
        Ok(variant_id)
    })
}

#[ic_cdk::update]
fn subscribe_newsletter(email: String) -> Result<String, String> {
    // Validate email format more thoroughly
    let email = email.trim().to_lowercase();

    if email.is_empty() {
        return Err("Email address is required".to_string());
    }

    if email.len() > 254 {
        return Err("Email address is too long".to_string());
    }

    // Basic email validation: must have exactly one @, with content before and after
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err("Invalid email address format".to_string());
    }

    let local = parts[0];
    let domain = parts[1];

    if local.is_empty() || local.len() > 64 {
        return Err("Invalid email address format".to_string());
    }

    if domain.is_empty() || !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
        return Err("Invalid email domain".to_string());
    }

    // Check for invalid characters
    if email.contains("..") || local.starts_with('.') || local.ends_with('.') {
        return Err("Invalid email address format".to_string());
    }

    with_connection(|conn| {
        let now = now();
        conn.execute(
            "INSERT OR IGNORE INTO newsletter_subscribers (email, created_at) VALUES (?1, ?2)",
            (&email, now),
        ).map_err(|e| e.to_string())?;

        Ok("Subscribed successfully".to_string())
    })
}

// ============================================
// STORE SETTINGS (CMS)
// ============================================

#[ic_cdk::query]
fn get_store_settings() -> Result<Vec<StoreSetting>, String> {
    with_connection(|conn| {
        let mut stmt = conn.prepare("SELECT key, value FROM store_settings").map_err(|e| e.to_string())?;
        let settings = stmt.query_map([], |row| {
            Ok(StoreSetting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        }).map_err(|e| e.to_string())?
        .collect::<ic_rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
        
        Ok(settings)
    })
}

#[ic_cdk::update]
fn update_store_settings(input: UpdateSettingsInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    with_connection(|conn| {
        let now = now();
        for setting in input.settings {
            // Upsert setting
            conn.execute(
                "INSERT INTO store_settings (key, value, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?3)
                 ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
                (setting.key, setting.value, now),
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    })
}

// ============================================
// EMAIL & NOTIFICATIONS
// ============================================

#[ic_cdk::query]
fn get_email_settings() -> Result<EmailSettings, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        conn.query_row(
            "SELECT provider, api_key, sender_email, active FROM email_settings WHERE id = 1",
            [],
            |row| {
                let api_key: Option<String> = row.get(1)?;
                // Mask API key - only show if it's set, never return actual value
                let masked_key = api_key.map(|k| {
                    if k.is_empty() { String::new() }
                    else { format!("{}...{}", &k[..4.min(k.len())], "****") }
                }).unwrap_or_default();

                Ok(EmailSettings {
                    provider: row.get(0)?,
                    api_key: masked_key,
                    sender_email: row.get(2)?,
                    active: row.get::<_, i64>(3)? == 1,
                })
            }
        ).map_err(|e| e.to_string())
    })
}

#[ic_cdk::update]
fn update_email_settings(input: UpdateEmailSettingsInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();
        conn.execute(
            "UPDATE email_settings SET provider = ?1, api_key = ?2, sender_email = ?3, active = ?4, updated_at = ?5 WHERE id = 1",
            (input.provider, input.api_key, input.sender_email, if input.active { 1 } else { 0 }, now)
        ).map_err(|e| e.to_string())?;
        Ok(())
    })
}

// ============================================
// EMAIL TEMPLATES
// ============================================

#[derive(CandidType, Deserialize, Clone)]
pub struct EmailTemplate {
    pub id: i64,
    pub event_type: String,
    pub name: String,
    pub subject: String,
    pub body_html: String,
    pub body_text: String,
    pub active: bool,
}

#[derive(CandidType, Deserialize)]
pub struct UpdateEmailTemplateInput {
    pub subject: Option<String>,
    pub body_html: Option<String>,
    pub body_text: Option<String>,
    pub active: Option<bool>,
}

#[ic_cdk::query]
fn get_email_templates() -> Result<Vec<EmailTemplate>, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, event_type, name, subject, body_html, body_text, active FROM email_templates ORDER BY id ASC"
        ).map_err(|e| e.to_string())?;

        let templates = stmt.query_map([], |row| {
            Ok(EmailTemplate {
                id: row.get(0)?,
                event_type: row.get(1)?,
                name: row.get(2)?,
                subject: row.get(3)?,
                body_html: row.get(4)?,
                body_text: row.get(5)?,
                active: row.get::<_, i64>(6)? == 1,
            })
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

        Ok(templates)
    })
}

#[ic_cdk::query]
fn get_email_template(event_type: String) -> Result<EmailTemplate, String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        conn.query_row(
            "SELECT id, event_type, name, subject, body_html, body_text, active FROM email_templates WHERE event_type = ?1",
            (&event_type,),
            |row| Ok(EmailTemplate {
                id: row.get(0)?,
                event_type: row.get(1)?,
                name: row.get(2)?,
                subject: row.get(3)?,
                body_html: row.get(4)?,
                body_text: row.get(5)?,
                active: row.get::<_, i64>(6)? == 1,
            })
        ).map_err(|e| format!("Template not found: {}", e))
    })
}

#[ic_cdk::update]
fn update_email_template(event_type: String, input: UpdateEmailTemplateInput) -> Result<(), String> {
    if !is_admin() { return Err("Admin only".to_string()); }
    with_connection(|conn| {
        let now = now();

        if let Some(subject) = input.subject {
            conn.execute(
                "UPDATE email_templates SET subject = ?1, updated_at = ?2 WHERE event_type = ?3",
                (&subject, now, &event_type)
            ).ok();
        }
        if let Some(body_html) = input.body_html {
            conn.execute(
                "UPDATE email_templates SET body_html = ?1, updated_at = ?2 WHERE event_type = ?3",
                (&body_html, now, &event_type)
            ).ok();
        }
        if let Some(body_text) = input.body_text {
            conn.execute(
                "UPDATE email_templates SET body_text = ?1, updated_at = ?2 WHERE event_type = ?3",
                (&body_text, now, &event_type)
            ).ok();
        }
        if let Some(active) = input.active {
            conn.execute(
                "UPDATE email_templates SET active = ?1, updated_at = ?2 WHERE event_type = ?3",
                (if active { 1 } else { 0 }, now, &event_type)
            ).ok();
        }

        Ok(())
    })
}

#[ic_cdk::update]
async fn send_test_email(event_type: String, to_email: String) -> Result<String, String> {
    if !is_admin() { return Err("Admin only".to_string()); }

    // Get email settings and template
    let (settings, template) = with_connection(|conn| {
        let settings = conn.query_row(
            "SELECT provider, api_key, sender_email, active FROM email_settings WHERE id = 1",
            [],
            |row| Ok(EmailSettings {
                provider: row.get(0)?,
                api_key: row.get(1)?,
                sender_email: row.get(2)?,
                active: row.get::<_, i64>(3)? == 1,
            })
        ).map_err(|e| format!("Email settings not configured: {}", e))?;

        let template = conn.query_row(
            "SELECT id, event_type, name, subject, body_html, body_text, active FROM email_templates WHERE event_type = ?1",
            (&event_type,),
            |row| Ok(EmailTemplate {
                id: row.get(0)?,
                event_type: row.get(1)?,
                name: row.get(2)?,
                subject: row.get(3)?,
                body_html: row.get(4)?,
                body_text: row.get(5)?,
                active: row.get::<_, i64>(6)? == 1,
            })
        ).map_err(|e| format!("Template not found: {}", e))?;

        Ok::<_, String>((settings, template))
    })?;

    if !settings.active {
        return Err("Email sending is disabled".to_string());
    }

    // Replace template variables with test data
    let subject = template.subject
        .replace("{{order_number}}", "TEST-123456")
        .replace("{{store_name}}", "Canister Shop");

    // Sample items for test email
    let sample_items_html = r#"<tr><td style="padding: 8px 0;">2 x Sample Product - $29.99</td></tr>
<tr><td style="padding: 8px 0;">1 x Another Item - $39.99</td></tr>"#;
    let sample_items_text = "2 x Sample Product - $29.99\n1 x Another Item - $39.99";

    // Handle the {{#items}}...{{/items}} block
    let body_html = if template.body_html.contains("{{#items}}") && template.body_html.contains("{{/items}}") {
        let start_tag = "{{#items}}";
        let end_tag = "{{/items}}";
        if let (Some(start), Some(end)) = (template.body_html.find(start_tag), template.body_html.find(end_tag)) {
            let before = &template.body_html[..start];
            let after = &template.body_html[end + end_tag.len()..];
            format!("{}{}{}", before, sample_items_html, after)
        } else {
            template.body_html.clone()
        }
    } else {
        template.body_html.clone()
    };

    let body_html = body_html
        .replace("{{store_name}}", "Canister Shop")
        .replace("{{customer_name}}", "Test Customer")
        .replace("{{order_number}}", "TEST-123456")
        .replace("{{total}}", "$99.99")
        .replace("{{shipping_address}}", "123 Test St<br>Test City, TS 12345")
        .replace("{{tracking_number}}", "1Z999AA10123456784")
        .replace("{{tracking_url}}", "https://www.ups.com/track?tracknum=1Z999AA10123456784");

    // Send via SendGrid
    let request_headers = vec![
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", settings.api_key) },
        HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
    ];

    let text_body = template.body_text
        .replace("{{store_name}}", "Canister Shop")
        .replace("{{customer_name}}", "Test Customer")
        .replace("{{order_number}}", "TEST-123456")
        .replace("{{total}}", "$99.99")
        .replace("{{items_text}}", sample_items_text)
        .replace("{{shipping_address}}", "123 Test St, Test City, TS 12345")
        .replace("{{tracking_number}}", "1Z999AA10123456784");

    let json_body = serde_json::json!({
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.sender_email},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text_body},
            {"type": "text/html", "value": body_html}
        ]
    }).to_string();

    let request = CanisterHttpRequestArgument {
        url: "https://api.sendgrid.com/v3/mail/send".to_string(),
        method: HttpMethod::POST,
        body: Some(json_body.into_bytes()),
        max_response_bytes: Some(2048),
        transform: None,
        headers: request_headers,
    };

    match http_request(request, 2_000_000_000).await {
        Ok((response,)) => {
            if response.status == 202u64 || response.status == 200u64 {
                Ok(format!("Test email sent successfully to {}", to_email))
            } else {
                let body = String::from_utf8_lossy(&response.body);
                Err(format!("SendGrid error ({}): {}", response.status, body))
            }
        }
        Err((code, msg)) => Err(format!("HTTP request failed: {:?} - {}", code, msg))
    }
}

async fn send_templated_email(event_type: &str, to: String, order_number: String, customer_name: String, total_cents: i64, shipping_address: String, tracking_number: Option<String>, items_text: String) -> Result<(), String> {
    // Get settings and template
    let data = with_connection(|conn| {
        let settings = conn.query_row(
            "SELECT provider, api_key, sender_email, active FROM email_settings WHERE id = 1",
            [],
            |row| Ok(EmailSettings {
                provider: row.get(0)?,
                api_key: row.get(1)?,
                sender_email: row.get(2)?,
                active: row.get::<_, i64>(3)? == 1,
            })
        ).ok();

        let template = conn.query_row(
            "SELECT subject, body_html, body_text, active FROM email_templates WHERE event_type = ?1",
            (event_type,),
            |row| Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)? == 1,
            ))
        ).ok();

        let store_name: String = conn.query_row(
            "SELECT value FROM store_settings WHERE key = 'store_name'",
            [],
            |row| row.get(0)
        ).unwrap_or_else(|_| "Canister Shop".to_string());

        // Get tracking URL template from shipping method via order
        let tracking_url_template: Option<String> = conn.query_row(
            r#"SELECT sm.tracking_url FROM orders o
               JOIN shipments s ON s.order_id = o.id
               JOIN shipping_methods sm ON sm.id = s.shipping_method_id
               WHERE o.number = ?1"#,
            (&order_number,),
            |row| row.get(0)
        ).ok().flatten();

        (settings, template, store_name, tracking_url_template)
    });

    let (settings, template, store_name, tracking_url_template) = data;

    let settings = match settings {
        Some(s) if s.active && !s.api_key.is_empty() => s,
        _ => return Ok(()), // Email not configured or disabled
    };

    let (subject_template, body_html, body_text, template_active) = match template {
        Some(t) if t.3 => (t.0, t.1, t.2, true),
        _ => return Ok(()), // Template not found or disabled
    };

    if !template_active {
        return Ok(());
    }

    let total_formatted = format!("${:.2}", (total_cents as f64) / 100.0);
    let tracking = tracking_number.unwrap_or_default();

    // Build tracking URL using the shipping method's tracking_url template
    // The template may contain {{tracking_number}} placeholder
    // Also support :tracking placeholder format
    let tracking_url = tracking_url_template
        .map(|url| url.replace("{{tracking_number}}", &tracking).replace(":tracking", &tracking))
        .unwrap_or_else(|| {
            // Smart fallback: detect carrier from tracking number format
            if tracking.is_empty() {
                String::new()
            } else if tracking.starts_with("1Z") {
                // UPS tracking numbers start with 1Z
                format!("https://www.ups.com/track?tracknum={}", tracking)
            } else if tracking.len() == 12 || tracking.len() == 15 || tracking.len() == 20 {
                // FedEx tracking numbers are typically 12, 15, or 20 digits
                format!("https://www.fedex.com/fedextrack/?trknbr={}", tracking)
            } else if tracking.len() == 22 && tracking.chars().all(|c| c.is_ascii_digit()) {
                // USPS tracking numbers are typically 22 digits
                format!("https://tools.usps.com/go/TrackConfirmAction?tLabels={}", tracking)
            } else {
                // Generic fallback - Google search for tracking
                format!("https://www.google.com/search?q={}", tracking)
            }
        });

    // Replace template variables
    let subject = subject_template
        .replace("{{store_name}}", &store_name)
        .replace("{{order_number}}", &order_number);

    // Convert items_text to HTML format for the items section
    let items_html = items_text.lines()
        .map(|line| format!("<tr><td style=\"padding: 8px 0;\">{}</td></tr>", line))
        .collect::<Vec<_>>()
        .join("\n");

    // Handle the {{#items}}...{{/items}} block by replacing the entire section
    let html_body = if body_html.contains("{{#items}}") && body_html.contains("{{/items}}") {
        // Find and replace the items block with actual items
        let start_tag = "{{#items}}";
        let end_tag = "{{/items}}";
        if let (Some(start), Some(end)) = (body_html.find(start_tag), body_html.find(end_tag)) {
            let before = &body_html[..start];
            let after = &body_html[end + end_tag.len()..];
            format!("{}{}{}", before, items_html, after)
        } else {
            body_html.clone()
        }
    } else {
        body_html.clone()
    };

    let html_body = html_body
        .replace("{{store_name}}", &store_name)
        .replace("{{customer_name}}", &customer_name)
        .replace("{{order_number}}", &order_number)
        .replace("{{total}}", &total_formatted)
        .replace("{{shipping_address}}", &shipping_address.replace("\n", "<br>"))
        .replace("{{tracking_number}}", &tracking)
        .replace("{{tracking_url}}", &tracking_url);

    let text_body = body_text
        .replace("{{store_name}}", &store_name)
        .replace("{{customer_name}}", &customer_name)
        .replace("{{order_number}}", &order_number)
        .replace("{{total}}", &total_formatted)
        .replace("{{shipping_address}}", &shipping_address)
        .replace("{{items_text}}", &items_text)
        .replace("{{tracking_number}}", &tracking);

    // Send via SendGrid
    if settings.provider == "sendgrid" {
        let json_body = serde_json::json!({
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": settings.sender_email},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text_body},
                {"type": "text/html", "value": html_body}
            ]
        }).to_string();

        let request_headers = vec![
            HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
            HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", settings.api_key) },
        ];

        let request = CanisterHttpRequestArgument {
            url: "https://api.sendgrid.com/v3/mail/send".to_string(),
            method: HttpMethod::POST,
            body: Some(json_body.into_bytes()),
            max_response_bytes: Some(2048),
            transform: None,
            headers: request_headers,
        };

        match http_request(request, 2_000_000_000).await {
            Ok(_) => ic_cdk::print(format!("Email ({}) sent to {}", event_type, to)),
            Err((code, msg)) => ic_cdk::print(format!("Failed to send email: {:?} {}", code, msg)),
        }
    }
    Ok(())
}

async fn send_order_confirmation(
    to: String,
    order_number: String,
    total_cents: i64,
    customer_name: String,
    shipping_address: String,
    items_text: String,
) -> Result<(), String> {
    send_templated_email(
        "order_confirmation",
        to,
        order_number,
        customer_name,
        total_cents,
        shipping_address,
        None,
        items_text,
    ).await
}

// Generate Candid interface - must be at end of file to export all functions
export_candid!();

