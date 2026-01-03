// IC-Commerce Types
// Based on Solidus e-commerce schema

use candid::{CandidType, Deserialize};
use serde::Serialize;

// ============================================
// AUTH & PERMISSIONS
// ============================================

#[derive(CandidType, Deserialize, Clone)]
pub struct AuthResult {
    pub user_id: i64,
    pub role: super::UserRole,
    pub principal: String,
    pub permissions: Vec<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct UserDetail {
    pub id: i64,
    pub principal: String,
    pub email: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: i64,
    pub order_count: i64,
    pub total_spent: i64,
}

#[derive(CandidType, Deserialize, Clone, Default)]
pub struct UserQueryParams {
    pub role: Option<String>,
    pub q: Option<String>,  // search email/principal
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UserListResponse {
    pub users: Vec<UserDetail>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateUserInput {
    pub email: Option<String>,
    pub role: Option<String>,
    pub roles: Option<Vec<String>>,
}

// Customer includes both registered users and guest checkouts
#[derive(CandidType, Deserialize, Clone)]
pub struct CustomerSummary {
    pub id: i64,
    pub email: String,
    pub customer_type: String,  // "registered" or "guest"
    pub principal: Option<String>,
    pub order_count: i64,
    pub total_spent: i64,
    pub first_order_at: i64,
    pub last_order_at: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CustomerListResponse {
    pub customers: Vec<CustomerSummary>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

#[derive(CandidType, Deserialize, Clone, Default)]
pub struct CustomerQueryParams {
    pub q: Option<String>,  // search by email
    pub customer_type: Option<String>,  // "registered", "guest", or None for all
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

// ============================================
// PRODUCTS
// ============================================

#[derive(CandidType, Deserialize, Clone, Default)]
pub struct ProductQueryParams {
    pub q: Option<String>,           // search query
    pub taxon_id: Option<i64>,       // category filter
    pub sort: Option<String>,        // price_asc, price_desc, name_asc, name_desc, created_at
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub in_stock: Option<bool>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ProductSummary {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub price: i64,                  // cents
    pub stock: i64,
    pub image_url: Option<String>,
    pub available: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct ProductListResponse {
    pub products: Vec<ProductSummary>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ProductDetail {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub available_on: Option<i64>,
    pub discontinue_on: Option<i64>,
    pub promotionable: bool,
    pub price: i64,
    pub variants: Vec<VariantDetail>,
    pub images: Vec<ProductImage>,
    pub taxons: Vec<TaxonRef>,
    pub properties: Vec<ProductProperty>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct VariantDetail {
    pub id: i64,
    pub sku: String,
    pub is_master: bool,
    pub position: i64,
    pub price: i64,
    pub stock: i64,
    pub backorderable: bool,
    pub option_values: Vec<OptionValueRef>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct OptionValueRef {
    pub id: i64,
    pub name: String,
    pub presentation: String,
    pub option_type_name: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct OptionType {
    pub id: i64,
    pub name: String,
    pub presentation: String,
    pub position: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ProductImage {
    pub id: i64,
    pub url: String,
    pub alt: Option<String>,
    pub position: i64,
    pub variant_id: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct TaxonRef {
    pub id: i64,
    pub name: String,
    pub permalink: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ProductProperty {
    pub name: String,
    pub presentation: String,
    pub value: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateProductInput {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub price: i64,
    pub sku: Option<String>,
    pub stock: Option<i64>,
    pub backorderable: Option<bool>,
    pub available_on: Option<i64>,
    pub promotionable: Option<bool>,
    pub image_url: Option<String>,
    pub taxon_ids: Option<Vec<i64>>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateProductInput {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub price: Option<i64>,
    pub stock: Option<i64>,
    pub available_on: Option<i64>,
    pub discontinue_on: Option<i64>,
    pub taxon_ids: Option<Vec<i64>>,
}

// ============================================
// TAXONOMIES & TAXONS
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct TaxonomyWithTaxons {
    pub id: i64,
    pub name: String,
    pub position: i64,
    pub taxons: Vec<TaxonDetail>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct TaxonDetail {
    pub id: i64,
    pub name: String,
    pub permalink: Option<String>,
    pub parent_id: Option<i64>,
    pub position: i64,
    pub depth: i64,
    pub product_count: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateTaxonomyInput {
    pub name: String,
    pub position: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateTaxonInput {
    pub taxonomy_id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub permalink: Option<String>,
    pub position: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateTaxonInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub permalink: Option<String>,
    pub parent_id: Option<i64>,
    pub position: Option<i64>,
}

// ============================================
// ADDRESSES
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct AddressDetail {
    pub id: i64,
    pub firstname: String,
    pub lastname: String,
    pub address1: String,
    pub address2: Option<String>,
    pub city: String,
    pub state_name: Option<String>,
    pub zipcode: String,
    pub country_code: String,
    pub phone: Option<String>,
    pub is_default: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AddressInput {
    pub firstname: String,
    pub lastname: String,
    pub address1: String,
    pub address2: Option<String>,
    pub city: String,
    pub state_name: Option<String>,
    pub zipcode: String,
    pub country_code: Option<String>,
    pub phone: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct SetAddressInput {
    pub email: String,
    pub shipping: AddressInput,
    pub billing: Option<AddressInput>,
    pub use_shipping_for_billing: Option<bool>,
}

// ============================================
// ORDERS
// ============================================

#[derive(CandidType, Deserialize, Clone, Default)]
pub struct OrderQueryParams {
    pub state: Option<String>,
    pub payment_state: Option<String>,
    pub shipment_state: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct OrderSummary {
    pub id: i64,
    pub number: String,
    pub state: String,
    pub total: i64,
    pub item_count: i64,
    pub payment_state: Option<String>,
    pub shipment_state: Option<String>,
    pub completed_at: Option<i64>,
    pub created_at: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AdminOrderSummary {
    pub id: i64,
    pub number: String,
    pub email: Option<String>,
    pub state: String,
    pub total: i64,
    pub item_count: i64,
    pub payment_state: Option<String>,
    pub shipment_state: Option<String>,
    pub tracking_number: Option<String>,
    pub completed_at: Option<i64>,
    pub created_at: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct OrderListResponse {
    pub orders: Vec<AdminOrderSummary>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct OrderDetail {
    pub id: i64,
    pub number: String,
    pub email: Option<String>,
    pub state: String,
    pub item_total: i64,
    pub shipment_total: i64,
    pub tax_total: i64,
    pub promo_total: i64,
    pub total: i64,
    pub item_count: i64,
    pub adjustment_total: i64,
    pub payment_state: Option<String>,
    pub shipment_state: Option<String>,
    pub completed_at: Option<i64>,
    pub created_at: i64,
    pub line_items: Vec<LineItemDetail>,
    pub adjustments: Vec<AdjustmentDetail>,
    pub ship_address: Option<AddressDetail>,
    pub bill_address: Option<AddressDetail>,
    pub shipment: Option<ShipmentDetail>,
    pub payments: Vec<PaymentDetail>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct LineItemDetail {
    pub id: i64,
    pub variant_id: i64,
    pub quantity: i64,
    pub price: i64,
    pub total: i64,
    pub currency: String,
    pub product_name: String,
    pub product_slug: String,
    pub variant_sku: Option<String>,
    pub image_url: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct AdjustmentDetail {
    pub id: i64,
    pub label: Option<String>,
    pub amount: i64,
    pub source_type: Option<String>,
    pub adjustable_type: String,
    pub included: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ShipmentDetail {
    pub id: i64,
    pub number: String,
    pub tracking: Option<String>,
    pub cost: i64,
    pub state: String,
    pub shipped_at: Option<i64>,
    pub shipping_method_id: Option<i64>,
    pub shipping_method_name: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct PaymentDetail {
    pub id: i64,
    pub amount: i64,
    pub state: String,
    pub payment_method_name: String,
    pub created_at: i64,
}

// ============================================
// SHIPPING
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ShippingMethod {
    pub id: i64,
    pub name: String,
    pub display_on: Option<String>,
    pub tracking_url: Option<String>,
    pub admin_name: Option<String>,
    pub code: Option<String>,
    pub carrier: Option<String>,
    pub service_level: Option<String>,
    pub cost: i64,
    pub active: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateShippingMethodInput {
    pub name: String,
    pub admin_name: Option<String>,
    pub code: Option<String>,
    pub carrier: Option<String>,
    pub service_level: Option<String>,
    pub tracking_url: Option<String>,
    pub display_on: Option<String>,
    pub base_cost: i64,
    pub active: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateShippingMethodInput {
    pub name: Option<String>,
    pub admin_name: Option<String>,
    pub code: Option<String>,
    pub carrier: Option<String>,
    pub service_level: Option<String>,
    pub tracking_url: Option<String>,
    pub display_on: Option<String>,
    pub base_cost: Option<i64>,
    pub active: Option<bool>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
#[allow(dead_code)]
pub struct ShippingRate {
    pub shipping_method_id: i64,
    pub shipping_method_name: String,
    pub cost: i64,
    pub delivery_estimate: Option<String>,
}

// ============================================
// STOCK MANAGEMENT
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct StockLocation {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub city: Option<String>,
    pub state_name: Option<String>,
    pub zipcode: Option<String>,
    pub country_code: String,
    pub phone: Option<String>,
    pub active: bool,
    pub is_default: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateStockLocationInput {
    pub name: String,
    pub code: Option<String>,
    pub address1: Option<String>,
    pub city: Option<String>,
    pub state_name: Option<String>,
    pub zipcode: Option<String>,
    pub country_code: Option<String>,
    pub phone: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateStockLocationInput {
    pub name: Option<String>,
    pub code: Option<String>,
    pub address1: Option<String>,
    pub city: Option<String>,
    pub state_name: Option<String>,
    pub zipcode: Option<String>,
    pub country_code: Option<String>,
    pub active: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct StockItem {
    pub id: i64,
    pub stock_location_id: i64,
    pub stock_location_name: String,
    pub variant_id: i64,
    pub variant_sku: String,
    pub product_name: String,
    pub count_on_hand: i64,
    pub backorderable: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct StockAdjustmentInput {
    pub stock_item_id: i64,
    pub quantity: i64,  // positive or negative
    pub reason: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Default)]
pub struct StockQueryParams {
    pub stock_location_id: Option<i64>,
    pub low_stock: Option<bool>,  // filter to items with stock < 10
    pub q: Option<String>,  // search by sku or product name
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct StockListResponse {
    pub items: Vec<StockItem>,
    pub total_count: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

// ============================================
// TAX
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct TaxCategory {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_default: bool,
    pub tax_code: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct TaxRate {
    pub id: i64,
    pub name: Option<String>,
    pub amount: f64,  // decimal rate (0.08 = 8%)
    pub zone_id: Option<i64>,
    pub zone_name: Option<String>,
    pub tax_category_id: Option<i64>,
    pub tax_category_name: Option<String>,
    pub included_in_price: bool,
    pub show_rate_in_label: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateTaxRateInput {
    pub name: String,
    pub amount: f64,
    pub zone_id: i64,
    pub tax_category_id: Option<i64>,
    pub included_in_price: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateTaxRateInput {
    pub name: Option<String>,
    pub amount: Option<f64>,
    pub zone_id: Option<i64>,
    pub tax_category_id: Option<i64>,
    pub included_in_price: Option<bool>,
}

// ============================================
// ZONES
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct Zone {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub member_count: i64,
    pub members: Vec<ZoneMember>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct ZoneMember {
    pub id: i64,
    pub zoneable_type: String,  // Country or State
    pub zoneable_id: String,    // country code or state code
}

#[derive(CandidType, Deserialize, Clone)]
#[allow(dead_code)]
pub struct CreateZoneInput {
    pub name: String,
    pub description: Option<String>,
    pub members: Vec<ZoneMemberInput>,
}

#[derive(CandidType, Deserialize, Clone)]
#[allow(dead_code)]
pub struct ZoneMemberInput {
    pub zoneable_type: String,
    pub zoneable_id: String,
}

#[derive(CandidType, Deserialize, Clone)]
#[allow(dead_code)]
pub struct UpdateZoneInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub members: Option<Vec<ZoneMemberInput>>,
}

// ============================================
// CHOICES / VARIANTS INPUTS
// ============================================

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateOptionTypeInput {
    pub name: String,
    pub presentation: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateOptionValueInput {
    pub option_type_id: i64,
    pub name: String,
    pub presentation: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateVariantInput {
    pub product_id: i64,
    pub sku: String,
    pub price: i64,
    pub stock: i64,
    pub option_value_ids: Vec<i64>,
}


// ============================================
// PROMOTIONS
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct Promotion {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub code: Option<String>,
    pub starts_at: Option<i64>,
    pub expires_at: Option<i64>,
    pub usage_limit: Option<i64>,
    pub usage_count: i64,
    pub active: bool,
    pub rules: Vec<PromotionRule>,
    pub actions: Vec<PromotionAction>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct PromotionRule {
    pub id: i64,
    pub rule_type: String,  // ItemTotal, Product, User, FirstOrder
    pub preferences: String,  // JSON
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct PromotionAction {
    pub id: i64,
    pub action_type: String,  // CreateAdjustment, CreateItemAdjustment, FreeShipping
    pub calculator_type: String,  // FlatRate, PercentOff, FreeShipping
    pub preferences: String,  // JSON with amount/percent
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreatePromotionInput {
    pub name: String,
    pub description: Option<String>,
    pub code: Option<String>,
    pub starts_at: Option<i64>,
    pub expires_at: Option<i64>,
    pub usage_limit: Option<i64>,
    pub active: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdatePromotionInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub code: Option<String>,
    pub starts_at: Option<i64>,
    pub expires_at: Option<i64>,
    pub usage_limit: Option<i64>,
    pub active: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AddPromotionRuleInput {
    pub promotion_id: i64,
    pub rule_type: String,
    pub preferences: String,  // JSON
}

#[derive(CandidType, Deserialize, Clone)]
pub struct AddPromotionActionInput {
    pub promotion_id: i64,
    pub action_type: String,
    pub calculator_type: String,
    pub preferences: String,  // JSON
}

#[derive(CandidType, Deserialize, Clone)]
pub struct ApplyCouponInput {
    pub code: String,
}

// ============================================
// REFUNDS
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
#[allow(dead_code)]
pub struct Refund {
    pub id: i64,
    pub payment_id: i64,
    pub order_number: String,
    pub amount: i64,
    pub reason: Option<String>,
    pub state: String,
    pub transaction_id: Option<String>,
    pub created_at: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CreateRefundInput {
    pub payment_id: i64,
    pub amount: i64,
    pub reason_id: Option<i64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct RefundReason {
    pub id: i64,
    pub name: String,
    pub active: bool,
}

// ============================================
// PAYMENT METHODS
// ============================================

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct PaymentMethod {
    pub id: i64,
    pub name: String,
    pub method_type: String,
    pub description: Option<String>,
    pub active: bool,
    pub auto_capture: bool,
    pub position: i64,
    pub available_to_users: bool,
    pub available_to_admin: bool,
    // Stripe specific (only populated for stripe type)
    pub test_mode: Option<bool>,
    pub api_key_set: bool,  // indicates if API key is configured (don't expose actual key)
    pub publishable_key: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
#[allow(dead_code)]
pub struct CreatePaymentMethodInput {
    pub name: String,
    pub method_type: String,
    pub description: Option<String>,
    pub auto_capture: Option<bool>,
    pub position: Option<i64>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdatePaymentMethodInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub active: Option<bool>,
    pub auto_capture: Option<bool>,
    pub position: Option<i64>,
    // Stripe settings
    pub api_key: Option<String>,
    pub publishable_key: Option<String>,
    pub webhook_secret: Option<String>,
    pub test_mode: Option<bool>,
}

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

#[derive(CandidType, Deserialize, Clone)]
pub struct DashboardStats {
    pub total_revenue: i64,
    pub total_orders: i64,
    pub pending_orders: i64,
    pub total_customers: i64,
    pub low_stock_count: i64,
    pub total_products: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RevenueStats {
    pub total_revenue: i64,
    pub total_orders: i64,
    pub average_order_value: i64,
    pub orders_today: i64,
    pub revenue_today: i64,
    pub orders_this_week: i64,
    pub revenue_this_week: i64,
    pub orders_this_month: i64,
    pub revenue_this_month: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TopProduct {
    pub product_id: i64,
    pub product_name: String,
    pub quantity_sold: i64,
    pub revenue: i64,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RecentOrderSummary {
    pub id: i64,
    pub number: String,
    pub total: i64,
    pub created_at: i64,
    pub email: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RevenueData {
    pub stats: RevenueStats,
    pub top_products: Vec<TopProduct>,
    pub recent_orders: Vec<RecentOrderSummary>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
#[allow(dead_code)]
pub struct SalesReport {
    pub period: String,  // day, week, month
    pub data: Vec<SalesDataPoint>,
    pub total_revenue: i64,
    pub total_orders: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
#[allow(dead_code)]
pub struct SalesDataPoint {
    pub date: String,
    pub revenue: i64,
    pub orders: i64,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct StoreSetting {
    pub key: String,
    pub value: String,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateSettingsInput {
    pub settings: Vec<StoreSetting>,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct EmailSettings {
    pub provider: String,
    pub api_key: String,
    pub sender_email: String,
    pub active: bool,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UpdateEmailSettingsInput {
    pub provider: String,
    pub api_key: String,
    pub sender_email: String,
    pub active: bool,
}
