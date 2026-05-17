import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import RouteIcon from '@mui/icons-material/Route';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ImageIcon from '@mui/icons-material/Image';
import BookIcon from '@mui/icons-material/Book';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export const ALL_DASHBOARD_CARDS = [
  { key: "packing", title: "Packing", subtitle: "Pending", icon: InventoryIcon, color: "#ff3d07", path: "/pending", emoji: "📦" },
  { key: "load", title: "Load", subtitle: "Shipping", icon: LocalShippingIcon, color: "#00a611", path: "/load", emoji: "🚚" },
  { key: "spo", title: "SPO", subtitle: "Working", icon: AssessmentIcon, color: "#FFC107", path: "/turnoverreport", emoji: "📊" },
  { key: "paymentvoucher", title: "Payment", subtitle: "Voucher", icon: AccountBalanceWalletIcon, color: "#795548", path: "/paymentvoucher", emoji: "💳" },
  { key: "saleshistory", title: "History", subtitle: "Sales", icon: HistoryIcon, color: "#009688", path: "/saleshistory", emoji: "🕐" },
  { key: "accounts", title: "Accounts", subtitle: "COA", icon: PeopleAltIcon, color: "#610051", path: "/coa", emoji: "👥" },
  { key: "recovery", title: "Recovery", subtitle: "Dues", icon: ReceiptLongIcon, color: "#2e7d32", path: "/recovery", dynamicValue: "todayRecovery", emoji: "🧾" },
  { key: "sales", title: "Sales", subtitle: "Daily", icon: TrendingUpIcon, color: "#009688", path: "/sales", dynamicValue: "todaySales", emoji: "📈" },
  { key: "neworder", title: "New Order", subtitle: "Invoice", icon: AddShoppingCartIcon, color: "#1976d2", path: "/order", dynamicValue: "todayPendingOrders", emoji: "🛒" },
  { key: "products", title: "Spot Sales", subtitle: "Stock", icon: ShoppingBagIcon, color: "#ff00ea", path: "/productslist", emoji: "🛍️" },
  { key: "routes", title: "Routes", subtitle: "Mapping", icon: RouteIcon, color: "#3f51b5", path: "/list", emoji: "🗺️" },
  { key: "delivery", title: "Delivery", subtitle: "Tracking", icon: DeliveryDiningIcon, color: "#a41260", path: "/delivery", emoji: "🛵" },
  { key: "imageviewer", title: "Images", subtitle: "Viewer", icon: ImageIcon, color: "#0288d1", path: "/image-viewer", emoji: "🖼️" },
  { key: "ledger", title: "Ledger", subtitle: "Statement", icon: BookIcon, color: "#7b1fa2", path: "/ledger", emoji: "📖" },
  { key: "pendingdemand", title: "Pending", subtitle: "Demand", icon: ListAltIcon, color: "#E91E63", path: "/pending-demand", emoji: "📝" },
  { key: "attendance", title: "Attendance", subtitle: "Daily", icon: AccessTimeIcon, color: "#4caf50", path: "/attendance", emoji: "🕒" },
  { key: "tracking", title: "Tracking", subtitle: "Live GPS", icon: LocationOnIcon, color: "#e91e63", path: "/tracking", adminOnly: true, emoji: "📍" },
  { key: "visibility", title: "Visibility", subtitle: "Manager", icon: AdminPanelSettingsIcon, color: "#6c63ff", path: "/admin/visibility", adminOnly: true, emoji: "⚙️" },
];

export const FALLBACK_VISIBILITY = {
  packing: ["admin", "pack", "operator"],
  load: ["admin", "pack", "operator"],
  spo: ["admin", "spo", "operator"],
  paymentvoucher: ["admin", "payment"],
  saleshistory: ["admin"],
  accounts: ["admin", "operator"],
  recovery: ["admin", "sm", "operator"],
  sales: ["admin", "sm", "operator"],
  neworder: ["admin", "sm", "operator"],
  products: ["admin"],
  routes: ["admin", "sm"],
  delivery: ["admin", "sm", "bilty"],
  imageviewer: ["admin", "sm", "operator"],
  ledger: ["admin", "sm", "operator"],
  pendingdemand: ["admin", "sm", "operator"],
  attendance: ["admin", "sm", "operator"],
};

export const USER_TYPES = ["admin", "sm", "operator", "pack", "payment", "spo", "bilty"];
