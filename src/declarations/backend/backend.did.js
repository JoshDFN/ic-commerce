export const idlFactory = ({ IDL }) => {
  const Result_Int64 = IDL.Variant({ 'Ok' : IDL.Int64, 'Err' : IDL.Text });
  const PaymentDetail = IDL.Record({
    'id' : IDL.Int64,
    'created_at' : IDL.Int64,
    'state' : IDL.Text,
    'amount' : IDL.Int64,
    'payment_method_name' : IDL.Text,
  });
  const ShipmentDetail = IDL.Record({
    'id' : IDL.Int64,
    'cost' : IDL.Int64,
    'tracking' : IDL.Opt(IDL.Text),
    'state' : IDL.Text,
    'shipping_method_id' : IDL.Opt(IDL.Int64),
    'number' : IDL.Text,
    'shipping_method_name' : IDL.Opt(IDL.Text),
    'shipped_at' : IDL.Opt(IDL.Int64),
  });
  const LineItemDetail = IDL.Record({
    'id' : IDL.Int64,
    'total' : IDL.Int64,
    'image_url' : IDL.Opt(IDL.Text),
    'variant_id' : IDL.Int64,
    'product_name' : IDL.Text,
    'product_slug' : IDL.Text,
    'currency' : IDL.Text,
    'quantity' : IDL.Int64,
    'price' : IDL.Int64,
  });
  const AdjustmentDetail = IDL.Record({
    'id' : IDL.Int64,
    'adjustable_type' : IDL.Text,
    'included' : IDL.Bool,
    'label' : IDL.Opt(IDL.Text),
    'source_type' : IDL.Opt(IDL.Text),
    'amount' : IDL.Int64,
  });
  const AddressDetail = IDL.Record({
    'id' : IDL.Int64,
    'firstname' : IDL.Text,
    'city' : IDL.Text,
    'zipcode' : IDL.Text,
    'country_code' : IDL.Text,
    'phone' : IDL.Opt(IDL.Text),
    'address1' : IDL.Text,
    'address2' : IDL.Opt(IDL.Text),
    'state_name' : IDL.Opt(IDL.Text),
    'lastname' : IDL.Text,
  });
  const OrderDetail = IDL.Record({
    'id' : IDL.Int64,
    'total' : IDL.Int64,
    'shipment_state' : IDL.Opt(IDL.Text),
    'payments' : IDL.Vec(PaymentDetail),
    'shipment' : IDL.Opt(ShipmentDetail),
    'payment_state' : IDL.Opt(IDL.Text),
    'line_items' : IDL.Vec(LineItemDetail),
    'created_at' : IDL.Int64,
    'email' : IDL.Opt(IDL.Text),
    'adjustments' : IDL.Vec(AdjustmentDetail),
    'state' : IDL.Text,
    'number' : IDL.Text,
    'adjustment_total' : IDL.Int64,
    'shipment_total' : IDL.Int64,
    'item_total' : IDL.Int64,
    'completed_at' : IDL.Opt(IDL.Int64),
    'tax_total' : IDL.Int64,
    'ship_address' : IDL.Opt(AddressDetail),
    'promo_total' : IDL.Int64,
    'bill_address' : IDL.Opt(AddressDetail),
    'item_count' : IDL.Int64,
  });
  const Result = IDL.Variant({ 'Ok' : OrderDetail, 'Err' : IDL.Text });
  const AddPromotionActionInput = IDL.Record({
    'promotion_id' : IDL.Int64,
    'action_type' : IDL.Text,
    'preferences' : IDL.Text,
    'calculator_type' : IDL.Text,
  });
  const AddPromotionRuleInput = IDL.Record({
    'rule_type' : IDL.Text,
    'promotion_id' : IDL.Int64,
    'preferences' : IDL.Text,
  });
  const StockAdjustmentInput = IDL.Record({
    'stock_item_id' : IDL.Int64,
    'quantity' : IDL.Int64,
    'reason' : IDL.Opt(IDL.Text),
  });
  const Result_Void = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const CreatePromotionInput = IDL.Record({
    'usage_limit' : IDL.Opt(IDL.Int64),
    'active' : IDL.Opt(IDL.Bool),
    'starts_at' : IDL.Opt(IDL.Int64),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'expires_at' : IDL.Opt(IDL.Int64),
  });
  const CreateRefundInput = IDL.Record({
    'reason_id' : IDL.Opt(IDL.Int64),
    'payment_id' : IDL.Int64,
    'amount' : IDL.Int64,
  });
  const CreateShippingMethodInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'tracking_url' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'base_cost' : IDL.Int64,
    'admin_name' : IDL.Opt(IDL.Text),
    'service_level' : IDL.Opt(IDL.Text),
    'carrier' : IDL.Opt(IDL.Text),
    'display_on' : IDL.Opt(IDL.Text),
  });
  const CreateStockLocationInput = IDL.Record({
    'city' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'is_default' : IDL.Opt(IDL.Bool),
    'zipcode' : IDL.Opt(IDL.Text),
    'country_code' : IDL.Opt(IDL.Text),
    'phone' : IDL.Opt(IDL.Text),
    'address1' : IDL.Opt(IDL.Text),
    'state_name' : IDL.Opt(IDL.Text),
  });
  const CreateTaxRateInput = IDL.Record({
    'tax_category_id' : IDL.Opt(IDL.Int64),
    'name' : IDL.Text,
    'zone_id' : IDL.Int64,
    'amount' : IDL.Float64,
    'included_in_price' : IDL.Opt(IDL.Bool),
  });
  const CreateTaxonInput = IDL.Record({
    'permalink' : IDL.Opt(IDL.Text),
    'taxonomy_id' : IDL.Int64,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'parent_id' : IDL.Opt(IDL.Int64),
    'position' : IDL.Opt(IDL.Int64),
  });
  const CreateTaxonomyInput = IDL.Record({
    'name' : IDL.Text,
    'position' : IDL.Opt(IDL.Int64),
  });
  const ZoneMemberInput = IDL.Record({
    'zoneable_id' : IDL.Text,
    'zoneable_type' : IDL.Text,
  });
  const CreateZoneInput = IDL.Record({
    'members' : IDL.Vec(ZoneMemberInput),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
  });
  const CustomerQueryParams = IDL.Record({
    'q' : IDL.Opt(IDL.Text),
    'per_page' : IDL.Opt(IDL.Int64),
    'page' : IDL.Opt(IDL.Int64),
    'customer_type' : IDL.Opt(IDL.Text),
  });
  const CustomerSummary = IDL.Record({
    'id' : IDL.Int64,
    'total_spent' : IDL.Int64,
    'principal' : IDL.Opt(IDL.Text),
    'order_count' : IDL.Int64,
    'last_order_at' : IDL.Int64,
    'email' : IDL.Text,
    'first_order_at' : IDL.Int64,
    'customer_type' : IDL.Text,
  });
  const CustomerListResponse = IDL.Record({
    'per_page' : IDL.Int64,
    'page' : IDL.Int64,
    'total_pages' : IDL.Int64,
    'total_count' : IDL.Int64,
    'customers' : IDL.Vec(CustomerSummary),
  });
  const Result_CustomerListResponse = IDL.Variant({
    'Ok' : CustomerListResponse,
    'Err' : IDL.Text,
  });
  const OrderQueryParams = IDL.Record({
    'per_page' : IDL.Opt(IDL.Int64),
    'shipment_state' : IDL.Opt(IDL.Text),
    'page' : IDL.Opt(IDL.Int64),
    'payment_state' : IDL.Opt(IDL.Text),
    'state' : IDL.Opt(IDL.Text),
  });
  const AdminOrderSummary = IDL.Record({
    'id' : IDL.Int64,
    'total' : IDL.Int64,
    'shipment_state' : IDL.Opt(IDL.Text),
    'payment_state' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Int64,
    'email' : IDL.Opt(IDL.Text),
    'tracking_number' : IDL.Opt(IDL.Text),
    'state' : IDL.Text,
    'number' : IDL.Text,
    'completed_at' : IDL.Opt(IDL.Int64),
    'item_count' : IDL.Int64,
  });
  const OrderListResponse = IDL.Record({
    'per_page' : IDL.Int64,
    'orders' : IDL.Vec(AdminOrderSummary),
    'page' : IDL.Int64,
    'total_pages' : IDL.Int64,
    'total_count' : IDL.Int64,
  });
  const Result_OrderListResponse = IDL.Variant({
    'Ok' : OrderListResponse,
    'Err' : IDL.Text,
  });
  const PaymentMethod = IDL.Record({
    'id' : IDL.Int64,
    'active' : IDL.Bool,
    'available_to_admin' : IDL.Bool,
    'test_mode' : IDL.Opt(IDL.Bool),
    'auto_capture' : IDL.Bool,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'api_key_set' : IDL.Bool,
    'method_type' : IDL.Text,
    'publishable_key' : IDL.Opt(IDL.Text),
    'available_to_users' : IDL.Bool,
    'position' : IDL.Int64,
  });
  const Result_PaymentMethodVec = IDL.Variant({
    'Ok' : IDL.Vec(PaymentMethod),
    'Err' : IDL.Text,
  });
  const PromotionAction = IDL.Record({
    'id' : IDL.Int64,
    'action_type' : IDL.Text,
    'preferences' : IDL.Text,
    'calculator_type' : IDL.Text,
  });
  const PromotionRule = IDL.Record({
    'id' : IDL.Int64,
    'rule_type' : IDL.Text,
    'preferences' : IDL.Text,
  });
  const Promotion = IDL.Record({
    'id' : IDL.Int64,
    'usage_limit' : IDL.Opt(IDL.Int64),
    'active' : IDL.Bool,
    'starts_at' : IDL.Opt(IDL.Int64),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'actions' : IDL.Vec(PromotionAction),
    'expires_at' : IDL.Opt(IDL.Int64),
    'usage_count' : IDL.Int64,
    'rules' : IDL.Vec(PromotionRule),
  });
  const Result_PromotionVec = IDL.Variant({
    'Ok' : IDL.Vec(Promotion),
    'Err' : IDL.Text,
  });
  const ShippingMethod = IDL.Record({
    'id' : IDL.Int64,
    'active' : IDL.Bool,
    'tracking_url' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'cost' : IDL.Int64,
    'name' : IDL.Text,
    'admin_name' : IDL.Opt(IDL.Text),
    'service_level' : IDL.Opt(IDL.Text),
    'carrier' : IDL.Opt(IDL.Text),
    'display_on' : IDL.Opt(IDL.Text),
  });
  const Result_ShippingMethodVec = IDL.Variant({
    'Ok' : IDL.Vec(ShippingMethod),
    'Err' : IDL.Text,
  });
  const StockQueryParams = IDL.Record({
    'q' : IDL.Opt(IDL.Text),
    'per_page' : IDL.Opt(IDL.Int64),
    'page' : IDL.Opt(IDL.Int64),
    'stock_location_id' : IDL.Opt(IDL.Int64),
    'low_stock' : IDL.Opt(IDL.Bool),
  });
  const StockItem = IDL.Record({
    'id' : IDL.Int64,
    'backorderable' : IDL.Bool,
    'variant_sku' : IDL.Text,
    'variant_id' : IDL.Int64,
    'product_name' : IDL.Text,
    'stock_location_id' : IDL.Int64,
    'stock_location_name' : IDL.Text,
    'count_on_hand' : IDL.Int64,
  });
  const StockListResponse = IDL.Record({
    'per_page' : IDL.Int64,
    'page' : IDL.Int64,
    'total_pages' : IDL.Int64,
    'items' : IDL.Vec(StockItem),
    'total_count' : IDL.Int64,
  });
  const Result_StockListResponse = IDL.Variant({
    'Ok' : StockListResponse,
    'Err' : IDL.Text,
  });
  const StockLocation = IDL.Record({
    'id' : IDL.Int64,
    'active' : IDL.Bool,
    'city' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'is_default' : IDL.Bool,
    'zipcode' : IDL.Opt(IDL.Text),
    'country_code' : IDL.Text,
    'phone' : IDL.Opt(IDL.Text),
    'address1' : IDL.Opt(IDL.Text),
    'address2' : IDL.Opt(IDL.Text),
    'state_name' : IDL.Opt(IDL.Text),
  });
  const Result_StockLocationVec = IDL.Variant({
    'Ok' : IDL.Vec(StockLocation),
    'Err' : IDL.Text,
  });
  const UserDetail = IDL.Record({
    'id' : IDL.Int64,
    'permissions' : IDL.Vec(IDL.Text),
    'total_spent' : IDL.Int64,
    'principal' : IDL.Text,
    'order_count' : IDL.Int64,
    'role' : IDL.Text,
    'created_at' : IDL.Int64,
    'email' : IDL.Opt(IDL.Text),
    'roles' : IDL.Vec(IDL.Text),
  });
  const Result_UserDetail = IDL.Variant({
    'Ok' : UserDetail,
    'Err' : IDL.Text,
  });
  const UserQueryParams = IDL.Record({
    'q' : IDL.Opt(IDL.Text),
    'per_page' : IDL.Opt(IDL.Int64),
    'page' : IDL.Opt(IDL.Int64),
    'role' : IDL.Opt(IDL.Text),
  });
  const UserListResponse = IDL.Record({
    'per_page' : IDL.Int64,
    'page' : IDL.Int64,
    'total_pages' : IDL.Int64,
    'users' : IDL.Vec(UserDetail),
    'total_count' : IDL.Int64,
  });
  const Result_UserListResponse = IDL.Variant({
    'Ok' : UserListResponse,
    'Err' : IDL.Text,
  });
  const UpdatePaymentMethodInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'webhook_secret' : IDL.Opt(IDL.Text),
    'test_mode' : IDL.Opt(IDL.Bool),
    'api_key' : IDL.Opt(IDL.Text),
    'auto_capture' : IDL.Opt(IDL.Bool),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'publishable_key' : IDL.Opt(IDL.Text),
    'position' : IDL.Opt(IDL.Int64),
  });
  const UpdatePromotionInput = IDL.Record({
    'usage_limit' : IDL.Opt(IDL.Int64),
    'active' : IDL.Opt(IDL.Bool),
    'starts_at' : IDL.Opt(IDL.Int64),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'expires_at' : IDL.Opt(IDL.Int64),
  });
  const UpdateShippingMethodInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'tracking_url' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'base_cost' : IDL.Opt(IDL.Int64),
    'admin_name' : IDL.Opt(IDL.Text),
    'service_level' : IDL.Opt(IDL.Text),
    'carrier' : IDL.Opt(IDL.Text),
    'display_on' : IDL.Opt(IDL.Text),
  });
  const UpdateStockLocationInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'city' : IDL.Opt(IDL.Text),
    'code' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'is_default' : IDL.Opt(IDL.Bool),
    'zipcode' : IDL.Opt(IDL.Text),
    'country_code' : IDL.Opt(IDL.Text),
    'address1' : IDL.Opt(IDL.Text),
    'state_name' : IDL.Opt(IDL.Text),
  });
  const UpdateTaxRateInput = IDL.Record({
    'tax_category_id' : IDL.Opt(IDL.Int64),
    'name' : IDL.Opt(IDL.Text),
    'zone_id' : IDL.Opt(IDL.Int64),
    'amount' : IDL.Opt(IDL.Float64),
    'included_in_price' : IDL.Opt(IDL.Bool),
  });
  const UpdateTaxonInput = IDL.Record({
    'permalink' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'parent_id' : IDL.Opt(IDL.Int64),
    'position' : IDL.Opt(IDL.Int64),
  });
  const UpdateUserInput = IDL.Record({
    'role' : IDL.Opt(IDL.Text),
    'email' : IDL.Opt(IDL.Text),
    'roles' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const UpdateZoneInput = IDL.Record({
    'members' : IDL.Opt(IDL.Vec(ZoneMemberInput)),
    'name' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
  });
  const ApplyCouponInput = IDL.Record({ 'code' : IDL.Text });
  const CreateOptionTypeInput = IDL.Record({
    'name' : IDL.Text,
    'presentation' : IDL.Text,
  });
  const CreateOptionValueInput = IDL.Record({
    'name' : IDL.Text,
    'presentation' : IDL.Text,
    'option_type_id' : IDL.Int64,
  });
  const Result_Text = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const CreateProductInput = IDL.Record({
    'sku' : IDL.Opt(IDL.Text),
    'meta_description' : IDL.Opt(IDL.Text),
    'available_on' : IDL.Opt(IDL.Int64),
    'image_url' : IDL.Opt(IDL.Text),
    'backorderable' : IDL.Opt(IDL.Bool),
    'name' : IDL.Text,
    'slug' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'stock' : IDL.Opt(IDL.Int64),
    'taxon_ids' : IDL.Opt(IDL.Vec(IDL.Int64)),
    'price' : IDL.Int64,
    'meta_title' : IDL.Opt(IDL.Text),
    'promotionable' : IDL.Opt(IDL.Bool),
  });
  const CreateVariantInput = IDL.Record({
    'sku' : IDL.Text,
    'product_id' : IDL.Int64,
    'option_value_ids' : IDL.Vec(IDL.Int64),
    'stock' : IDL.Int64,
    'price' : IDL.Int64,
  });
  const Result_OrderDetailOpt = IDL.Variant({
    'Ok' : IDL.Opt(OrderDetail),
    'Err' : IDL.Text,
  });
  const DashboardStats = IDL.Record({
    'total_customers' : IDL.Int64,
    'total_products' : IDL.Int64,
    'low_stock_count' : IDL.Int64,
    'pending_orders' : IDL.Int64,
    'total_orders' : IDL.Int64,
    'total_revenue' : IDL.Int64,
  });
  const Result_DashboardStats = IDL.Variant({
    'Ok' : DashboardStats,
    'Err' : IDL.Text,
  });
  const EmailSettings = IDL.Record({
    'active' : IDL.Bool,
    'provider' : IDL.Text,
    'api_key' : IDL.Text,
    'sender_email' : IDL.Text,
  });
  const Result_28 = IDL.Variant({ 'Ok' : EmailSettings, 'Err' : IDL.Text });
  const EmailTemplate = IDL.Record({
    'id' : IDL.Int64,
    'active' : IDL.Bool,
    'body_html' : IDL.Text,
    'subject' : IDL.Text,
    'body_text' : IDL.Text,
    'name' : IDL.Text,
    'event_type' : IDL.Text,
  });
  const Result_EmailTemplate = IDL.Variant({
    'Ok' : EmailTemplate,
    'Err' : IDL.Text,
  });
  const Result_EmailTemplateVec = IDL.Variant({
    'Ok' : IDL.Vec(EmailTemplate),
    'Err' : IDL.Text,
  });
  const OrderSummary = IDL.Record({
    'id' : IDL.Int64,
    'total' : IDL.Int64,
    'shipment_state' : IDL.Opt(IDL.Text),
    'payment_state' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Int64,
    'state' : IDL.Text,
    'number' : IDL.Text,
    'completed_at' : IDL.Opt(IDL.Int64),
    'item_count' : IDL.Int64,
  });
  const Result_OrderSummaryVec = IDL.Variant({
    'Ok' : IDL.Vec(OrderSummary),
    'Err' : IDL.Text,
  });
  const OptionValueRef = IDL.Record({
    'id' : IDL.Int64,
    'name' : IDL.Text,
    'presentation' : IDL.Text,
    'option_type_name' : IDL.Text,
  });
  const Result_ChoiceList = IDL.Variant({
    'Ok' : IDL.Vec(OptionValueRef),
    'Err' : IDL.Text,
  });
  const ProductProperty = IDL.Record({
    'value' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'presentation' : IDL.Text,
  });
  const VariantDetail = IDL.Record({
    'id' : IDL.Int64,
    'sku' : IDL.Text,
    'option_values' : IDL.Vec(OptionValueRef),
    'backorderable' : IDL.Bool,
    'is_master' : IDL.Bool,
    'stock' : IDL.Int64,
    'price' : IDL.Int64,
    'position' : IDL.Int64,
  });
  const TaxonRef = IDL.Record({
    'id' : IDL.Int64,
    'permalink' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
  });
  const ProductImage = IDL.Record({
    'id' : IDL.Int64,
    'alt' : IDL.Opt(IDL.Text),
    'url' : IDL.Text,
    'variant_id' : IDL.Int64,
    'position' : IDL.Int64,
  });
  const ProductDetail = IDL.Record({
    'id' : IDL.Int64,
    'meta_description' : IDL.Opt(IDL.Text),
    'updated_at' : IDL.Int64,
    'available_on' : IDL.Opt(IDL.Int64),
    'name' : IDL.Text,
    'slug' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'properties' : IDL.Vec(ProductProperty),
    'variants' : IDL.Vec(VariantDetail),
    'created_at' : IDL.Int64,
    'taxons' : IDL.Vec(TaxonRef),
    'discontinue_on' : IDL.Opt(IDL.Int64),
    'price' : IDL.Int64,
    'meta_title' : IDL.Opt(IDL.Text),
    'promotionable' : IDL.Bool,
    'images' : IDL.Vec(ProductImage),
  });
  const Result_ProductDetail = IDL.Variant({
    'Ok' : ProductDetail,
    'Err' : IDL.Text,
  });
  const ProductQueryParams = IDL.Record({
    'q' : IDL.Opt(IDL.Text),
    'per_page' : IDL.Opt(IDL.Int64),
    'page' : IDL.Opt(IDL.Int64),
    'sort' : IDL.Opt(IDL.Text),
    'in_stock' : IDL.Opt(IDL.Bool),
    'taxon_id' : IDL.Opt(IDL.Int64),
  });
  const ProductSummary = IDL.Record({
    'id' : IDL.Int64,
    'image_url' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'slug' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'available' : IDL.Bool,
    'stock' : IDL.Int64,
    'price' : IDL.Int64,
  });
  const ProductListResponse = IDL.Record({
    'per_page' : IDL.Int64,
    'page' : IDL.Int64,
    'total_pages' : IDL.Int64,
    'products' : IDL.Vec(ProductSummary),
    'total_count' : IDL.Int64,
  });
  const Result_ProductListResponse = IDL.Variant({
    'Ok' : ProductListResponse,
    'Err' : IDL.Text,
  });
  const RefundReason = IDL.Record({
    'id' : IDL.Int64,
    'active' : IDL.Bool,
    'name' : IDL.Text,
  });
  const Result_RefundReasonVec = IDL.Variant({
    'Ok' : IDL.Vec(RefundReason),
    'Err' : IDL.Text,
  });
  const RevenueStats = IDL.Record({
    'orders_today' : IDL.Int64,
    'revenue_this_week' : IDL.Int64,
    'revenue_today' : IDL.Int64,
    'total_orders' : IDL.Int64,
    'average_order_value' : IDL.Int64,
    'orders_this_week' : IDL.Int64,
    'total_revenue' : IDL.Int64,
    'revenue_this_month' : IDL.Int64,
    'orders_this_month' : IDL.Int64,
  });
  const TopProduct = IDL.Record({
    'revenue' : IDL.Int64,
    'product_id' : IDL.Int64,
    'product_name' : IDL.Text,
    'quantity_sold' : IDL.Int64,
  });
  const RecentOrderSummary = IDL.Record({
    'id' : IDL.Int64,
    'total' : IDL.Int64,
    'created_at' : IDL.Int64,
    'email' : IDL.Opt(IDL.Text),
    'number' : IDL.Text,
  });
  const RevenueData = IDL.Record({
    'stats' : RevenueStats,
    'top_products' : IDL.Vec(TopProduct),
    'recent_orders' : IDL.Vec(RecentOrderSummary),
  });
  const Result_RevenueData = IDL.Variant({
    'Ok' : RevenueData,
    'Err' : IDL.Text,
  });
  const StoreSetting = IDL.Record({ 'key' : IDL.Text, 'value' : IDL.Text });
  const Result_27 = IDL.Variant({
    'Ok' : IDL.Vec(StoreSetting),
    'Err' : IDL.Text,
  });
  const TaxCategory = IDL.Record({
    'id' : IDL.Int64,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'is_default' : IDL.Bool,
    'tax_code' : IDL.Opt(IDL.Text),
  });
  const Result_TaxCategoryVec = IDL.Variant({
    'Ok' : IDL.Vec(TaxCategory),
    'Err' : IDL.Text,
  });
  const TaxRate = IDL.Record({
    'id' : IDL.Int64,
    'tax_category_id' : IDL.Opt(IDL.Int64),
    'name' : IDL.Opt(IDL.Text),
    'zone_name' : IDL.Opt(IDL.Text),
    'show_rate_in_label' : IDL.Bool,
    'tax_category_name' : IDL.Opt(IDL.Text),
    'zone_id' : IDL.Opt(IDL.Int64),
    'amount' : IDL.Float64,
    'included_in_price' : IDL.Bool,
  });
  const Result_TaxRateVec = IDL.Variant({
    'Ok' : IDL.Vec(TaxRate),
    'Err' : IDL.Text,
  });
  const TaxonDetail = IDL.Record({
    'id' : IDL.Int64,
    'permalink' : IDL.Opt(IDL.Text),
    'name' : IDL.Text,
    'product_count' : IDL.Int64,
    'parent_id' : IDL.Opt(IDL.Int64),
    'position' : IDL.Int64,
    'depth' : IDL.Int64,
  });
  const TaxonomyWithTaxons = IDL.Record({
    'id' : IDL.Int64,
    'name' : IDL.Text,
    'taxons' : IDL.Vec(TaxonDetail),
    'position' : IDL.Int64,
  });
  const Result_TaxonomyVec = IDL.Variant({
    'Ok' : IDL.Vec(TaxonomyWithTaxons),
    'Err' : IDL.Text,
  });
  const UserRole = IDL.Variant({
    'Customer' : IDL.Null,
    'Guest' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const ZoneMember = IDL.Record({
    'id' : IDL.Int64,
    'zoneable_id' : IDL.Text,
    'zoneable_type' : IDL.Text,
  });
  const Zone = IDL.Record({
    'id' : IDL.Int64,
    'members' : IDL.Vec(ZoneMember),
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'member_count' : IDL.Int64,
  });
  const Result_ZoneVec = IDL.Variant({
    'Ok' : IDL.Vec(Zone),
    'Err' : IDL.Text,
  });
  const StripeWebhookInput = IDL.Record({
    'stripe_signature' : IDL.Text,
    'payload' : IDL.Text,
  });
  const AuthResult = IDL.Record({
    'principal' : IDL.Text,
    'role' : UserRole,
    'user_id' : IDL.Int64,
  });
  const Result_AuthResult = IDL.Variant({
    'Ok' : AuthResult,
    'Err' : IDL.Text,
  });
  const AddressInput = IDL.Record({
    'firstname' : IDL.Text,
    'city' : IDL.Text,
    'zipcode' : IDL.Text,
    'country_code' : IDL.Opt(IDL.Text),
    'phone' : IDL.Opt(IDL.Text),
    'address1' : IDL.Text,
    'address2' : IDL.Opt(IDL.Text),
    'state_name' : IDL.Opt(IDL.Text),
    'lastname' : IDL.Text,
  });
  const SetAddressInput = IDL.Record({
    'use_shipping_for_billing' : IDL.Opt(IDL.Bool),
    'shipping' : AddressInput,
    'billing' : IDL.Opt(AddressInput),
    'email' : IDL.Text,
  });
  const UpdateEmailSettingsInput = IDL.Record({
    'active' : IDL.Bool,
    'provider' : IDL.Text,
    'api_key' : IDL.Text,
    'sender_email' : IDL.Text,
  });
  const UpdateEmailTemplateInput = IDL.Record({
    'active' : IDL.Opt(IDL.Bool),
    'body_html' : IDL.Opt(IDL.Text),
    'subject' : IDL.Opt(IDL.Text),
    'body_text' : IDL.Opt(IDL.Text),
  });
  const UpdateProductInput = IDL.Record({
    'meta_description' : IDL.Opt(IDL.Text),
    'available_on' : IDL.Opt(IDL.Int64),
    'name' : IDL.Opt(IDL.Text),
    'slug' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'stock' : IDL.Opt(IDL.Int64),
    'discontinue_on' : IDL.Opt(IDL.Int64),
    'taxon_ids' : IDL.Opt(IDL.Vec(IDL.Int64)),
    'price' : IDL.Opt(IDL.Int64),
    'meta_title' : IDL.Opt(IDL.Text),
  });
  const UpdateSettingsInput = IDL.Record({
    'settings' : IDL.Vec(StoreSetting),
  });
  const Result_5 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  return IDL.Service({
    'add_product_image' : IDL.Func(
        [IDL.Int64, IDL.Text, IDL.Opt(IDL.Text)],
        [Result_Int64],
        [],
      ),
    'add_to_cart' : IDL.Func(
        [IDL.Int64, IDL.Int64, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'admin_add_promotion_action' : IDL.Func(
        [AddPromotionActionInput],
        [Result_Int64],
        [],
      ),
    'admin_add_promotion_rule' : IDL.Func(
        [AddPromotionRuleInput],
        [Result_Int64],
        [],
      ),
    'admin_adjust_stock' : IDL.Func([StockAdjustmentInput], [Result_Void], []),
    'admin_create_promotion' : IDL.Func(
        [CreatePromotionInput],
        [Result_Int64],
        [],
      ),
    'admin_create_refund' : IDL.Func([CreateRefundInput], [Result_Int64], []),
    'admin_create_shipping_method' : IDL.Func(
        [CreateShippingMethodInput],
        [Result_Int64],
        [],
      ),
    'admin_create_stock_location' : IDL.Func(
        [CreateStockLocationInput],
        [Result_Int64],
        [],
      ),
    'admin_create_tax_rate' : IDL.Func(
        [CreateTaxRateInput],
        [Result_Int64],
        [],
      ),
    'admin_create_taxon' : IDL.Func([CreateTaxonInput], [Result_Int64], []),
    'admin_create_taxonomy' : IDL.Func(
        [CreateTaxonomyInput],
        [Result_Int64],
        [],
      ),
    'admin_create_zone' : IDL.Func([CreateZoneInput], [Result_Int64], []),
    'admin_delete_shipping_method' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_delete_stock_location' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_delete_tax_rate' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_delete_taxon' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_delete_taxonomy' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_delete_zone' : IDL.Func([IDL.Int64], [Result_Void], []),
    'admin_get_customers' : IDL.Func(
        [CustomerQueryParams],
        [Result_CustomerListResponse],
        ['query'],
      ),
    'admin_get_orders' : IDL.Func(
        [OrderQueryParams],
        [Result_OrderListResponse],
        ['query'],
      ),
    'admin_get_payment_methods' : IDL.Func(
        [],
        [Result_PaymentMethodVec],
        ['query'],
      ),
    'admin_get_promotions' : IDL.Func([], [Result_PromotionVec], ['query']),
    'admin_get_shipping_methods' : IDL.Func(
        [],
        [Result_ShippingMethodVec],
        ['query'],
      ),
    'admin_get_stock_items' : IDL.Func(
        [StockQueryParams],
        [Result_StockListResponse],
        ['query'],
      ),
    'admin_get_stock_locations' : IDL.Func(
        [],
        [Result_StockLocationVec],
        ['query'],
      ),
    'admin_get_user' : IDL.Func([IDL.Int64], [Result_UserDetail], ['query']),
    'admin_get_users' : IDL.Func(
        [UserQueryParams],
        [Result_UserListResponse],
        ['query'],
      ),
    'admin_ship_order' : IDL.Func(
        [IDL.Int64, IDL.Opt(IDL.Text)],
        [Result_Void],
        [],
      ),
    'admin_update_order_state' : IDL.Func(
        [IDL.Int64, IDL.Text],
        [Result_Void],
        [],
      ),
    'admin_update_payment_method' : IDL.Func(
        [IDL.Int64, UpdatePaymentMethodInput],
        [Result_Void],
        [],
      ),
    'admin_update_promotion' : IDL.Func(
        [IDL.Int64, UpdatePromotionInput],
        [Result_Void],
        [],
      ),
    'admin_update_shipping_method' : IDL.Func(
        [IDL.Int64, UpdateShippingMethodInput],
        [Result_Void],
        [],
      ),
    'admin_update_stock_location' : IDL.Func(
        [IDL.Int64, UpdateStockLocationInput],
        [Result_Void],
        [],
      ),
    'admin_update_tax_rate' : IDL.Func(
        [IDL.Int64, UpdateTaxRateInput],
        [Result_Void],
        [],
      ),
    'admin_update_taxon' : IDL.Func(
        [IDL.Int64, UpdateTaxonInput],
        [Result_Void],
        [],
      ),
    'admin_update_taxonomy' : IDL.Func(
        [IDL.Int64, IDL.Text],
        [Result_Void],
        [],
      ),
    'admin_update_tracking' : IDL.Func(
        [IDL.Int64, IDL.Opt(IDL.Text)],
        [Result_Void],
        [],
      ),
    'admin_update_user' : IDL.Func(
        [IDL.Int64, UpdateUserInput],
        [Result_Void],
        [],
      ),
    'admin_update_zone' : IDL.Func(
        [IDL.Int64, UpdateZoneInput],
        [Result_Void],
        [],
      ),
    'apply_coupon' : IDL.Func(
        [ApplyCouponInput, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'complete_checkout' : IDL.Func([IDL.Opt(IDL.Text)], [Result], []),
    'create_option_type' : IDL.Func(
        [CreateOptionTypeInput],
        [Result_Int64],
        [],
      ),
    'create_option_value' : IDL.Func(
        [CreateOptionValueInput],
        [Result_Int64],
        [],
      ),
    'create_payment_intent' : IDL.Func([IDL.Int64], [Result_Text], []),
    'create_product' : IDL.Func([CreateProductInput], [Result_Int64], []),
    'create_stripe_checkout_session' : IDL.Func(
        [IDL.Int64, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [Result_Text],
        [],
      ),
    'create_stripe_payment_intent' : IDL.Func(
        [IDL.Int64, IDL.Opt(IDL.Text)],
        [Result_Text],
        [],
      ),
    'create_variant' : IDL.Func([CreateVariantInput], [Result_Int64], []),
    'delete_product' : IDL.Func([IDL.Int64], [Result_Void], []),
    'delete_product_image' : IDL.Func([IDL.Int64], [Result_Void], []),
    'get_cart' : IDL.Func(
        [IDL.Opt(IDL.Text)],
        [Result_OrderDetailOpt],
        ['query'],
      ),
    'get_dashboard_stats' : IDL.Func([], [Result_DashboardStats], ['query']),
    'get_email_settings' : IDL.Func([], [Result_28], ['query']),
    'get_email_template' : IDL.Func(
        [IDL.Text],
        [Result_EmailTemplate],
        ['query'],
      ),
    'get_email_templates' : IDL.Func([], [Result_EmailTemplateVec], ['query']),
    'get_my_orders' : IDL.Func([], [Result_OrderSummaryVec], ['query']),
    'get_option_types' : IDL.Func([], [Result_ChoiceList], ['query']),
    'get_order' : IDL.Func([IDL.Text], [Result], ['query']),
    'get_payment_methods' : IDL.Func([], [Result_PaymentMethodVec], ['query']),
    'get_product' : IDL.Func([IDL.Text], [Result_ProductDetail], ['query']),
    'get_products' : IDL.Func(
        [ProductQueryParams],
        [Result_ProductListResponse],
        ['query'],
      ),
    'get_refund_reasons' : IDL.Func([], [Result_RefundReasonVec], ['query']),
    'get_revenue_stats' : IDL.Func([], [Result_RevenueData], ['query']),
    'get_shipping_methods' : IDL.Func(
        [],
        [Result_ShippingMethodVec],
        ['query'],
      ),
    'get_store_settings' : IDL.Func([], [Result_27], ['query']),
    'get_tax_categories' : IDL.Func([], [Result_TaxCategoryVec], ['query']),
    'get_tax_rates' : IDL.Func([], [Result_TaxRateVec], ['query']),
    'get_taxonomies' : IDL.Func([], [Result_TaxonomyVec], ['query']),
    'get_user_role' : IDL.Func([], [UserRole], ['query']),
    'get_zones' : IDL.Func([], [Result_ZoneVec], ['query']),
    'handle_stripe_webhook' : IDL.Func([StripeWebhookInput], [Result_Text], []),
    'initialize_auth' : IDL.Func([], [Result_AuthResult], []),
    'record_stripe_payment' : IDL.Func(
        [IDL.Int64, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [Result_Void],
        [],
      ),
    'remove_from_cart' : IDL.Func([IDL.Int64, IDL.Opt(IDL.Text)], [Result], []),
    'reorder_product_images' : IDL.Func(
        [IDL.Int64, IDL.Vec(IDL.Int64)],
        [Result_Void],
        [],
      ),
    'send_test_email' : IDL.Func([IDL.Text, IDL.Text], [Result_Text], []),
    'set_order_address' : IDL.Func(
        [SetAddressInput, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'set_shipping_method' : IDL.Func(
        [IDL.Int64, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'subscribe_newsletter' : IDL.Func([IDL.Text], [Result_Text], []),
    'update_email_settings' : IDL.Func(
        [UpdateEmailSettingsInput],
        [Result_Void],
        [],
      ),
    'update_email_template' : IDL.Func(
        [IDL.Text, UpdateEmailTemplateInput],
        [Result_Void],
        [],
      ),
    'update_line_item' : IDL.Func(
        [IDL.Int64, IDL.Int64, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'update_product' : IDL.Func(
        [IDL.Int64, UpdateProductInput],
        [Result_Void],
        [],
      ),
    'update_store_settings' : IDL.Func([UpdateSettingsInput], [Result_5], []),
  });
};
export const init = ({ IDL }) => { return []; };
