import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import { SettingsProvider } from './hooks/useSettings';

// Layout & Error Handling
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Storefront Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderPage from './pages/OrderPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AccountPage from './pages/AccountPage';
import AboutPage from './pages/AboutPage';
import SupportPage from './pages/SupportPage';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminRevenue from './pages/admin/Revenue';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminCustomers from './pages/admin/Customers';
import AdminProductVariants from './pages/admin/ProductVariants';
import AdminSettings from './pages/admin/Settings';
import AdminPaymentMethods from './pages/admin/PaymentMethods';
import AdminShippingMethods from './pages/admin/ShippingMethods';
import AdminZones from './pages/admin/Zones';
import AdminTaxonomies from './pages/admin/Taxonomies';
import AdminStockLocations from './pages/admin/StockLocations';
import AdminContent from './pages/admin/Content';
import AdminEmailSettings from './pages/admin/EmailSettings';
import AdminEmailTemplates from './pages/admin/EmailTemplates';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <SettingsProvider>
            <Routes>
            {/* Storefront */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:slug" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:number" element={<OrderPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<SupportPage />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/:id/variants" element={<AdminProductVariants />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="taxonomies" element={<AdminTaxonomies />} />
              <Route path="stock-locations" element={<AdminStockLocations />} />

              {/* Settings */}
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/content" element={<AdminContent />} />
              <Route path="settings/email" element={<AdminEmailSettings />} />
              <Route path="settings/email-templates" element={<AdminEmailTemplates />} />
              <Route path="settings/payment-methods" element={<AdminPaymentMethods />} />
              <Route path="settings/shipping-methods" element={<AdminShippingMethods />} />
              <Route path="settings/zones" element={<AdminZones />} />
              </Route>
            </Routes>
          </SettingsProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
