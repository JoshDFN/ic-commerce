import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface AddPromotionActionInput {
  'promotion_id' : bigint,
  'action_type' : string,
  'preferences' : string,
  'calculator_type' : string,
}
export interface AddPromotionRuleInput {
  'rule_type' : string,
  'promotion_id' : bigint,
  'preferences' : string,
}
export interface AddressDetail {
  'id' : bigint,
  'firstname' : string,
  'city' : string,
  'zipcode' : string,
  'country_code' : string,
  'phone' : [] | [string],
  'address1' : string,
  'address2' : [] | [string],
  'state_name' : [] | [string],
  'lastname' : string,
}
export interface AddressInput {
  'firstname' : string,
  'city' : string,
  'zipcode' : string,
  'country_code' : [] | [string],
  'phone' : [] | [string],
  'address1' : string,
  'address2' : [] | [string],
  'state_name' : [] | [string],
  'lastname' : string,
}
export interface AdjustmentDetail {
  'id' : bigint,
  'adjustable_type' : string,
  'included' : boolean,
  'label' : [] | [string],
  'source_type' : [] | [string],
  'amount' : bigint,
}
export interface AdminOrderSummary {
  'id' : bigint,
  'total' : bigint,
  'shipment_state' : [] | [string],
  'payment_state' : [] | [string],
  'created_at' : bigint,
  'email' : [] | [string],
  'tracking_number' : [] | [string],
  'state' : string,
  'number' : string,
  'completed_at' : [] | [bigint],
  'item_count' : bigint,
}
export interface ApplyCouponInput { 'code' : string }
export interface AuthResult {
  'principal' : string,
  'role' : UserRole,
  'user_id' : bigint,
}
export interface CreateOptionTypeInput {
  'name' : string,
  'presentation' : string,
}
export interface CreateOptionValueInput {
  'name' : string,
  'presentation' : string,
  'option_type_id' : bigint,
}
export interface CreateProductInput {
  'sku' : [] | [string],
  'meta_description' : [] | [string],
  'available_on' : [] | [bigint],
  'image_url' : [] | [string],
  'backorderable' : [] | [boolean],
  'name' : string,
  'slug' : string,
  'description' : [] | [string],
  'stock' : [] | [bigint],
  'taxon_ids' : [] | [BigInt64Array | bigint[]],
  'price' : bigint,
  'meta_title' : [] | [string],
  'promotionable' : [] | [boolean],
}
export interface CreatePromotionInput {
  'usage_limit' : [] | [bigint],
  'active' : [] | [boolean],
  'starts_at' : [] | [bigint],
  'code' : [] | [string],
  'name' : string,
  'description' : [] | [string],
  'expires_at' : [] | [bigint],
}
export interface CreateRefundInput {
  'reason_id' : [] | [bigint],
  'payment_id' : bigint,
  'amount' : bigint,
}
export interface CreateShippingMethodInput {
  'active' : [] | [boolean],
  'tracking_url' : [] | [string],
  'code' : [] | [string],
  'name' : string,
  'base_cost' : bigint,
  'admin_name' : [] | [string],
  'service_level' : [] | [string],
  'carrier' : [] | [string],
  'display_on' : [] | [string],
}
export interface CreateStockLocationInput {
  'city' : [] | [string],
  'code' : [] | [string],
  'name' : string,
  'is_default' : [] | [boolean],
  'zipcode' : [] | [string],
  'country_code' : [] | [string],
  'phone' : [] | [string],
  'address1' : [] | [string],
  'state_name' : [] | [string],
}
export interface CreateTaxRateInput {
  'tax_category_id' : [] | [bigint],
  'name' : string,
  'zone_id' : bigint,
  'amount' : number,
  'included_in_price' : [] | [boolean],
}
export interface CreateTaxonInput {
  'permalink' : [] | [string],
  'taxonomy_id' : bigint,
  'name' : string,
  'description' : [] | [string],
  'parent_id' : [] | [bigint],
  'position' : [] | [bigint],
}
export interface CreateTaxonomyInput {
  'name' : string,
  'position' : [] | [bigint],
}
export interface CreateVariantInput {
  'sku' : string,
  'product_id' : bigint,
  'option_value_ids' : BigInt64Array | bigint[],
  'stock' : bigint,
  'price' : bigint,
}
export interface CreateZoneInput {
  'members' : Array<ZoneMemberInput>,
  'name' : string,
  'description' : [] | [string],
}
export interface CustomerListResponse {
  'per_page' : bigint,
  'page' : bigint,
  'total_pages' : bigint,
  'total_count' : bigint,
  'customers' : Array<CustomerSummary>,
}
export interface CustomerQueryParams {
  'q' : [] | [string],
  'per_page' : [] | [bigint],
  'page' : [] | [bigint],
  'customer_type' : [] | [string],
}
export interface CustomerSummary {
  'id' : bigint,
  'total_spent' : bigint,
  'principal' : [] | [string],
  'order_count' : bigint,
  'last_order_at' : bigint,
  'email' : string,
  'first_order_at' : bigint,
  'customer_type' : string,
}
export interface DashboardStats {
  'total_customers' : bigint,
  'total_products' : bigint,
  'low_stock_count' : bigint,
  'pending_orders' : bigint,
  'total_orders' : bigint,
  'total_revenue' : bigint,
}
export interface EmailSettings {
  'active' : boolean,
  'provider' : string,
  'api_key' : string,
  'sender_email' : string,
}
export interface EmailTemplate {
  'id' : bigint,
  'active' : boolean,
  'body_html' : string,
  'subject' : string,
  'body_text' : string,
  'name' : string,
  'event_type' : string,
}
export interface LineItemDetail {
  'id' : bigint,
  'total' : bigint,
  'image_url' : [] | [string],
  'variant_id' : bigint,
  'product_name' : string,
  'product_slug' : string,
  'currency' : string,
  'quantity' : bigint,
  'price' : bigint,
}
export interface OptionValueRef {
  'id' : bigint,
  'name' : string,
  'presentation' : string,
  'option_type_name' : string,
}
export interface OrderDetail {
  'id' : bigint,
  'total' : bigint,
  'shipment_state' : [] | [string],
  'payments' : Array<PaymentDetail>,
  'shipment' : [] | [ShipmentDetail],
  'payment_state' : [] | [string],
  'line_items' : Array<LineItemDetail>,
  'created_at' : bigint,
  'email' : [] | [string],
  'adjustments' : Array<AdjustmentDetail>,
  'state' : string,
  'number' : string,
  'adjustment_total' : bigint,
  'shipment_total' : bigint,
  'item_total' : bigint,
  'completed_at' : [] | [bigint],
  'tax_total' : bigint,
  'ship_address' : [] | [AddressDetail],
  'promo_total' : bigint,
  'bill_address' : [] | [AddressDetail],
  'item_count' : bigint,
}
export interface OrderListResponse {
  'per_page' : bigint,
  'orders' : Array<AdminOrderSummary>,
  'page' : bigint,
  'total_pages' : bigint,
  'total_count' : bigint,
}
export interface OrderQueryParams {
  'per_page' : [] | [bigint],
  'shipment_state' : [] | [string],
  'page' : [] | [bigint],
  'payment_state' : [] | [string],
  'state' : [] | [string],
}
export interface OrderSummary {
  'id' : bigint,
  'total' : bigint,
  'shipment_state' : [] | [string],
  'payment_state' : [] | [string],
  'created_at' : bigint,
  'state' : string,
  'number' : string,
  'completed_at' : [] | [bigint],
  'item_count' : bigint,
}
export interface PaymentDetail {
  'id' : bigint,
  'created_at' : bigint,
  'state' : string,
  'amount' : bigint,
  'payment_method_name' : string,
}
export interface PaymentMethod {
  'id' : bigint,
  'active' : boolean,
  'available_to_admin' : boolean,
  'test_mode' : [] | [boolean],
  'auto_capture' : boolean,
  'name' : string,
  'description' : [] | [string],
  'api_key_set' : boolean,
  'method_type' : string,
  'publishable_key' : [] | [string],
  'available_to_users' : boolean,
  'position' : bigint,
}
export interface ProductDetail {
  'id' : bigint,
  'meta_description' : [] | [string],
  'updated_at' : bigint,
  'available_on' : [] | [bigint],
  'name' : string,
  'slug' : string,
  'description' : [] | [string],
  'properties' : Array<ProductProperty>,
  'variants' : Array<VariantDetail>,
  'created_at' : bigint,
  'taxons' : Array<TaxonRef>,
  'discontinue_on' : [] | [bigint],
  'price' : bigint,
  'meta_title' : [] | [string],
  'promotionable' : boolean,
  'images' : Array<ProductImage>,
}
export interface ProductImage {
  'id' : bigint,
  'alt' : [] | [string],
  'url' : string,
  'variant_id' : bigint,
  'position' : bigint,
}
export interface ProductListResponse {
  'per_page' : bigint,
  'page' : bigint,
  'total_pages' : bigint,
  'products' : Array<ProductSummary>,
  'total_count' : bigint,
}
export interface ProductProperty {
  'value' : [] | [string],
  'name' : string,
  'presentation' : string,
}
export interface ProductQueryParams {
  'q' : [] | [string],
  'per_page' : [] | [bigint],
  'page' : [] | [bigint],
  'sort' : [] | [string],
  'in_stock' : [] | [boolean],
  'taxon_id' : [] | [bigint],
}
export interface ProductSummary {
  'id' : bigint,
  'image_url' : [] | [string],
  'name' : string,
  'slug' : string,
  'description' : [] | [string],
  'available' : boolean,
  'stock' : bigint,
  'price' : bigint,
}
export interface Promotion {
  'id' : bigint,
  'usage_limit' : [] | [bigint],
  'active' : boolean,
  'starts_at' : [] | [bigint],
  'code' : [] | [string],
  'name' : string,
  'description' : [] | [string],
  'actions' : Array<PromotionAction>,
  'expires_at' : [] | [bigint],
  'usage_count' : bigint,
  'rules' : Array<PromotionRule>,
}
export interface PromotionAction {
  'id' : bigint,
  'action_type' : string,
  'preferences' : string,
  'calculator_type' : string,
}
export interface PromotionRule {
  'id' : bigint,
  'rule_type' : string,
  'preferences' : string,
}
export interface RecentOrderSummary {
  'id' : bigint,
  'total' : bigint,
  'created_at' : bigint,
  'email' : [] | [string],
  'number' : string,
}
export interface RefundReason {
  'id' : bigint,
  'active' : boolean,
  'name' : string,
}
export type Result = { 'Ok' : OrderDetail } |
  { 'Err' : string };
export type Result_27 = { 'Ok' : Array<StoreSetting> } |
  { 'Err' : string };
export type Result_28 = { 'Ok' : EmailSettings } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : null } |
  { 'Err' : string };
export type Result_AuthResult = { 'Ok' : AuthResult } |
  { 'Err' : string };
export type Result_ChoiceList = { 'Ok' : Array<OptionValueRef> } |
  { 'Err' : string };
export type Result_CustomerListResponse = { 'Ok' : CustomerListResponse } |
  { 'Err' : string };
export type Result_DashboardStats = { 'Ok' : DashboardStats } |
  { 'Err' : string };
export type Result_EmailTemplate = { 'Ok' : EmailTemplate } |
  { 'Err' : string };
export type Result_EmailTemplateVec = { 'Ok' : Array<EmailTemplate> } |
  { 'Err' : string };
export type Result_Int64 = { 'Ok' : bigint } |
  { 'Err' : string };
export type Result_OrderDetailOpt = { 'Ok' : [] | [OrderDetail] } |
  { 'Err' : string };
export type Result_OrderListResponse = { 'Ok' : OrderListResponse } |
  { 'Err' : string };
export type Result_OrderSummaryVec = { 'Ok' : Array<OrderSummary> } |
  { 'Err' : string };
export type Result_PaymentMethodVec = { 'Ok' : Array<PaymentMethod> } |
  { 'Err' : string };
export type Result_ProductDetail = { 'Ok' : ProductDetail } |
  { 'Err' : string };
export type Result_ProductListResponse = { 'Ok' : ProductListResponse } |
  { 'Err' : string };
export type Result_PromotionVec = { 'Ok' : Array<Promotion> } |
  { 'Err' : string };
export type Result_RefundReasonVec = { 'Ok' : Array<RefundReason> } |
  { 'Err' : string };
export type Result_RevenueData = { 'Ok' : RevenueData } |
  { 'Err' : string };
export type Result_ShippingMethodVec = { 'Ok' : Array<ShippingMethod> } |
  { 'Err' : string };
export type Result_StockListResponse = { 'Ok' : StockListResponse } |
  { 'Err' : string };
export type Result_StockLocationVec = { 'Ok' : Array<StockLocation> } |
  { 'Err' : string };
export type Result_TaxCategoryVec = { 'Ok' : Array<TaxCategory> } |
  { 'Err' : string };
export type Result_TaxRateVec = { 'Ok' : Array<TaxRate> } |
  { 'Err' : string };
export type Result_TaxonomyVec = { 'Ok' : Array<TaxonomyWithTaxons> } |
  { 'Err' : string };
export type Result_Text = { 'Ok' : string } |
  { 'Err' : string };
export type Result_UserDetail = { 'Ok' : UserDetail } |
  { 'Err' : string };
export type Result_UserListResponse = { 'Ok' : UserListResponse } |
  { 'Err' : string };
export type Result_Void = { 'Ok' : null } |
  { 'Err' : string };
export type Result_ZoneVec = { 'Ok' : Array<Zone> } |
  { 'Err' : string };
export interface RevenueData {
  'stats' : RevenueStats,
  'top_products' : Array<TopProduct>,
  'recent_orders' : Array<RecentOrderSummary>,
}
export interface RevenueStats {
  'orders_today' : bigint,
  'revenue_this_week' : bigint,
  'revenue_today' : bigint,
  'total_orders' : bigint,
  'average_order_value' : bigint,
  'orders_this_week' : bigint,
  'total_revenue' : bigint,
  'revenue_this_month' : bigint,
  'orders_this_month' : bigint,
}
export interface SetAddressInput {
  'use_shipping_for_billing' : [] | [boolean],
  'shipping' : AddressInput,
  'billing' : [] | [AddressInput],
  'email' : string,
}
export interface ShipmentDetail {
  'id' : bigint,
  'cost' : bigint,
  'tracking' : [] | [string],
  'state' : string,
  'shipping_method_id' : [] | [bigint],
  'number' : string,
  'shipping_method_name' : [] | [string],
  'shipped_at' : [] | [bigint],
}
export interface ShippingMethod {
  'id' : bigint,
  'active' : boolean,
  'tracking_url' : [] | [string],
  'code' : [] | [string],
  'cost' : bigint,
  'name' : string,
  'admin_name' : [] | [string],
  'service_level' : [] | [string],
  'carrier' : [] | [string],
  'display_on' : [] | [string],
}
export interface StockAdjustmentInput {
  'stock_item_id' : bigint,
  'quantity' : bigint,
  'reason' : [] | [string],
}
export interface StockItem {
  'id' : bigint,
  'backorderable' : boolean,
  'variant_sku' : string,
  'variant_id' : bigint,
  'product_name' : string,
  'stock_location_id' : bigint,
  'stock_location_name' : string,
  'count_on_hand' : bigint,
}
export interface StockListResponse {
  'per_page' : bigint,
  'page' : bigint,
  'total_pages' : bigint,
  'items' : Array<StockItem>,
  'total_count' : bigint,
}
export interface StockLocation {
  'id' : bigint,
  'active' : boolean,
  'city' : [] | [string],
  'code' : [] | [string],
  'name' : string,
  'is_default' : boolean,
  'zipcode' : [] | [string],
  'country_code' : string,
  'phone' : [] | [string],
  'address1' : [] | [string],
  'address2' : [] | [string],
  'state_name' : [] | [string],
}
export interface StockQueryParams {
  'q' : [] | [string],
  'per_page' : [] | [bigint],
  'page' : [] | [bigint],
  'stock_location_id' : [] | [bigint],
  'low_stock' : [] | [boolean],
}
export interface StoreSetting { 'key' : string, 'value' : string }
export interface StripeWebhookInput {
  'stripe_signature' : string,
  'payload' : string,
}
export interface TaxCategory {
  'id' : bigint,
  'name' : string,
  'description' : [] | [string],
  'is_default' : boolean,
  'tax_code' : [] | [string],
}
export interface TaxRate {
  'id' : bigint,
  'tax_category_id' : [] | [bigint],
  'name' : [] | [string],
  'zone_name' : [] | [string],
  'show_rate_in_label' : boolean,
  'tax_category_name' : [] | [string],
  'zone_id' : [] | [bigint],
  'amount' : number,
  'included_in_price' : boolean,
}
export interface TaxonDetail {
  'id' : bigint,
  'permalink' : [] | [string],
  'name' : string,
  'product_count' : bigint,
  'parent_id' : [] | [bigint],
  'position' : bigint,
  'depth' : bigint,
}
export interface TaxonRef {
  'id' : bigint,
  'permalink' : [] | [string],
  'name' : string,
}
export interface TaxonomyWithTaxons {
  'id' : bigint,
  'name' : string,
  'taxons' : Array<TaxonDetail>,
  'position' : bigint,
}
export interface TopProduct {
  'revenue' : bigint,
  'product_id' : bigint,
  'product_name' : string,
  'quantity_sold' : bigint,
}
export interface UpdateEmailSettingsInput {
  'active' : boolean,
  'provider' : string,
  'api_key' : string,
  'sender_email' : string,
}
export interface UpdateEmailTemplateInput {
  'active' : [] | [boolean],
  'body_html' : [] | [string],
  'subject' : [] | [string],
  'body_text' : [] | [string],
}
export interface UpdatePaymentMethodInput {
  'active' : [] | [boolean],
  'webhook_secret' : [] | [string],
  'test_mode' : [] | [boolean],
  'api_key' : [] | [string],
  'auto_capture' : [] | [boolean],
  'name' : [] | [string],
  'description' : [] | [string],
  'publishable_key' : [] | [string],
  'position' : [] | [bigint],
}
export interface UpdateProductInput {
  'meta_description' : [] | [string],
  'available_on' : [] | [bigint],
  'name' : [] | [string],
  'slug' : [] | [string],
  'description' : [] | [string],
  'stock' : [] | [bigint],
  'discontinue_on' : [] | [bigint],
  'taxon_ids' : [] | [BigInt64Array | bigint[]],
  'price' : [] | [bigint],
  'meta_title' : [] | [string],
}
export interface UpdatePromotionInput {
  'usage_limit' : [] | [bigint],
  'active' : [] | [boolean],
  'starts_at' : [] | [bigint],
  'code' : [] | [string],
  'name' : [] | [string],
  'description' : [] | [string],
  'expires_at' : [] | [bigint],
}
export interface UpdateSettingsInput { 'settings' : Array<StoreSetting> }
export interface UpdateShippingMethodInput {
  'active' : [] | [boolean],
  'tracking_url' : [] | [string],
  'code' : [] | [string],
  'name' : [] | [string],
  'base_cost' : [] | [bigint],
  'admin_name' : [] | [string],
  'service_level' : [] | [string],
  'carrier' : [] | [string],
  'display_on' : [] | [string],
}
export interface UpdateStockLocationInput {
  'active' : [] | [boolean],
  'city' : [] | [string],
  'code' : [] | [string],
  'name' : [] | [string],
  'is_default' : [] | [boolean],
  'zipcode' : [] | [string],
  'country_code' : [] | [string],
  'address1' : [] | [string],
  'state_name' : [] | [string],
}
export interface UpdateTaxRateInput {
  'tax_category_id' : [] | [bigint],
  'name' : [] | [string],
  'zone_id' : [] | [bigint],
  'amount' : [] | [number],
  'included_in_price' : [] | [boolean],
}
export interface UpdateTaxonInput {
  'permalink' : [] | [string],
  'name' : [] | [string],
  'description' : [] | [string],
  'parent_id' : [] | [bigint],
  'position' : [] | [bigint],
}
export interface UpdateUserInput {
  'role' : [] | [string],
  'email' : [] | [string],
  'roles' : [] | [Array<string>],
}
export interface UpdateZoneInput {
  'members' : [] | [Array<ZoneMemberInput>],
  'name' : [] | [string],
  'description' : [] | [string],
}
export interface UserDetail {
  'id' : bigint,
  'permissions' : Array<string>,
  'total_spent' : bigint,
  'principal' : string,
  'order_count' : bigint,
  'role' : string,
  'created_at' : bigint,
  'email' : [] | [string],
  'roles' : Array<string>,
}
export interface UserListResponse {
  'per_page' : bigint,
  'page' : bigint,
  'total_pages' : bigint,
  'users' : Array<UserDetail>,
  'total_count' : bigint,
}
export interface UserQueryParams {
  'q' : [] | [string],
  'per_page' : [] | [bigint],
  'page' : [] | [bigint],
  'role' : [] | [string],
}
export type UserRole = { 'Customer' : null } |
  { 'Guest' : null } |
  { 'Admin' : null };
export interface VariantDetail {
  'id' : bigint,
  'sku' : string,
  'option_values' : Array<OptionValueRef>,
  'backorderable' : boolean,
  'is_master' : boolean,
  'stock' : bigint,
  'price' : bigint,
  'position' : bigint,
}
export interface Zone {
  'id' : bigint,
  'members' : Array<ZoneMember>,
  'name' : string,
  'description' : [] | [string],
  'member_count' : bigint,
}
export interface ZoneMember {
  'id' : bigint,
  'zoneable_id' : string,
  'zoneable_type' : string,
}
export interface ZoneMemberInput {
  'zoneable_id' : string,
  'zoneable_type' : string,
}
export interface _SERVICE {
  'add_product_image' : ActorMethod<
    [bigint, string, [] | [string]],
    Result_Int64
  >,
  'add_to_cart' : ActorMethod<[bigint, bigint, [] | [string]], Result>,
  'admin_add_promotion_action' : ActorMethod<
    [AddPromotionActionInput],
    Result_Int64
  >,
  'admin_add_promotion_rule' : ActorMethod<
    [AddPromotionRuleInput],
    Result_Int64
  >,
  'admin_adjust_stock' : ActorMethod<[StockAdjustmentInput], Result_Void>,
  'admin_create_promotion' : ActorMethod<[CreatePromotionInput], Result_Int64>,
  'admin_create_refund' : ActorMethod<[CreateRefundInput], Result_Int64>,
  'admin_create_shipping_method' : ActorMethod<
    [CreateShippingMethodInput],
    Result_Int64
  >,
  'admin_create_stock_location' : ActorMethod<
    [CreateStockLocationInput],
    Result_Int64
  >,
  'admin_create_tax_rate' : ActorMethod<[CreateTaxRateInput], Result_Int64>,
  'admin_create_taxon' : ActorMethod<[CreateTaxonInput], Result_Int64>,
  'admin_create_taxonomy' : ActorMethod<[CreateTaxonomyInput], Result_Int64>,
  'admin_create_zone' : ActorMethod<[CreateZoneInput], Result_Int64>,
  'admin_delete_shipping_method' : ActorMethod<[bigint], Result_Void>,
  'admin_delete_stock_location' : ActorMethod<[bigint], Result_Void>,
  'admin_delete_tax_rate' : ActorMethod<[bigint], Result_Void>,
  'admin_delete_taxon' : ActorMethod<[bigint], Result_Void>,
  'admin_delete_taxonomy' : ActorMethod<[bigint], Result_Void>,
  'admin_delete_zone' : ActorMethod<[bigint], Result_Void>,
  'admin_get_customers' : ActorMethod<
    [CustomerQueryParams],
    Result_CustomerListResponse
  >,
  'admin_get_orders' : ActorMethod<
    [OrderQueryParams],
    Result_OrderListResponse
  >,
  'admin_get_payment_methods' : ActorMethod<[], Result_PaymentMethodVec>,
  'admin_get_promotions' : ActorMethod<[], Result_PromotionVec>,
  'admin_get_shipping_methods' : ActorMethod<[], Result_ShippingMethodVec>,
  'admin_get_stock_items' : ActorMethod<
    [StockQueryParams],
    Result_StockListResponse
  >,
  'admin_get_stock_locations' : ActorMethod<[], Result_StockLocationVec>,
  'admin_get_user' : ActorMethod<[bigint], Result_UserDetail>,
  'admin_get_users' : ActorMethod<[UserQueryParams], Result_UserListResponse>,
  'admin_ship_order' : ActorMethod<[bigint, [] | [string]], Result_Void>,
  'admin_update_order_state' : ActorMethod<[bigint, string], Result_Void>,
  'admin_update_payment_method' : ActorMethod<
    [bigint, UpdatePaymentMethodInput],
    Result_Void
  >,
  'admin_update_promotion' : ActorMethod<
    [bigint, UpdatePromotionInput],
    Result_Void
  >,
  'admin_update_shipping_method' : ActorMethod<
    [bigint, UpdateShippingMethodInput],
    Result_Void
  >,
  'admin_update_stock_location' : ActorMethod<
    [bigint, UpdateStockLocationInput],
    Result_Void
  >,
  'admin_update_tax_rate' : ActorMethod<
    [bigint, UpdateTaxRateInput],
    Result_Void
  >,
  'admin_update_taxon' : ActorMethod<[bigint, UpdateTaxonInput], Result_Void>,
  'admin_update_taxonomy' : ActorMethod<[bigint, string], Result_Void>,
  'admin_update_tracking' : ActorMethod<[bigint, [] | [string]], Result_Void>,
  'admin_update_user' : ActorMethod<[bigint, UpdateUserInput], Result_Void>,
  'admin_update_zone' : ActorMethod<[bigint, UpdateZoneInput], Result_Void>,
  'apply_coupon' : ActorMethod<[ApplyCouponInput, [] | [string]], Result>,
  'complete_checkout' : ActorMethod<[[] | [string]], Result>,
  'create_option_type' : ActorMethod<[CreateOptionTypeInput], Result_Int64>,
  'create_option_value' : ActorMethod<[CreateOptionValueInput], Result_Int64>,
  'create_payment_intent' : ActorMethod<[bigint], Result_Text>,
  'create_product' : ActorMethod<[CreateProductInput], Result_Int64>,
  'create_stripe_checkout_session' : ActorMethod<
    [bigint, string, string, [] | [string]],
    Result_Text
  >,
  'create_stripe_payment_intent' : ActorMethod<
    [bigint, [] | [string]],
    Result_Text
  >,
  'create_variant' : ActorMethod<[CreateVariantInput], Result_Int64>,
  'delete_product' : ActorMethod<[bigint], Result_Void>,
  'delete_product_image' : ActorMethod<[bigint], Result_Void>,
  'get_cart' : ActorMethod<[[] | [string]], Result_OrderDetailOpt>,
  'get_dashboard_stats' : ActorMethod<[], Result_DashboardStats>,
  'get_email_settings' : ActorMethod<[], Result_28>,
  'get_email_template' : ActorMethod<[string], Result_EmailTemplate>,
  'get_email_templates' : ActorMethod<[], Result_EmailTemplateVec>,
  'get_my_orders' : ActorMethod<[], Result_OrderSummaryVec>,
  'get_option_types' : ActorMethod<[], Result_ChoiceList>,
  'get_order' : ActorMethod<[string], Result>,
  'get_payment_methods' : ActorMethod<[], Result_PaymentMethodVec>,
  'get_product' : ActorMethod<[string], Result_ProductDetail>,
  'get_products' : ActorMethod<
    [ProductQueryParams],
    Result_ProductListResponse
  >,
  'get_refund_reasons' : ActorMethod<[], Result_RefundReasonVec>,
  'get_revenue_stats' : ActorMethod<[], Result_RevenueData>,
  'get_shipping_methods' : ActorMethod<[], Result_ShippingMethodVec>,
  'get_store_settings' : ActorMethod<[], Result_27>,
  'get_tax_categories' : ActorMethod<[], Result_TaxCategoryVec>,
  'get_tax_rates' : ActorMethod<[], Result_TaxRateVec>,
  'get_taxonomies' : ActorMethod<[], Result_TaxonomyVec>,
  'get_user_role' : ActorMethod<[], UserRole>,
  'get_zones' : ActorMethod<[], Result_ZoneVec>,
  'handle_stripe_webhook' : ActorMethod<[StripeWebhookInput], Result_Text>,
  'initialize_auth' : ActorMethod<[], Result_AuthResult>,
  'record_stripe_payment' : ActorMethod<
    [bigint, string, string, [] | [string]],
    Result_Void
  >,
  'remove_from_cart' : ActorMethod<[bigint, [] | [string]], Result>,
  'reorder_product_images' : ActorMethod<
    [bigint, BigInt64Array | bigint[]],
    Result_Void
  >,
  'send_test_email' : ActorMethod<[string, string], Result_Text>,
  'set_order_address' : ActorMethod<[SetAddressInput, [] | [string]], Result>,
  'set_shipping_method' : ActorMethod<[bigint, [] | [string]], Result>,
  'subscribe_newsletter' : ActorMethod<[string], Result_Text>,
  'update_email_settings' : ActorMethod<
    [UpdateEmailSettingsInput],
    Result_Void
  >,
  'update_email_template' : ActorMethod<
    [string, UpdateEmailTemplateInput],
    Result_Void
  >,
  'update_line_item' : ActorMethod<[bigint, bigint, [] | [string]], Result>,
  'update_product' : ActorMethod<[bigint, UpdateProductInput], Result_Void>,
  'update_store_settings' : ActorMethod<[UpdateSettingsInput], Result_5>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
