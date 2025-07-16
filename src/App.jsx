import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  remove
} from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";
import "./App.css";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userBalance, setUserBalance] = useState(125.50);
  const [products, setProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [users, setUsers] = useState([]);

  // Database functions
  const createUserProfile = async (user) => {
    const userRef = ref(db, `users/${user.uid}`);
    const userSnap = await get(userRef);

    if (!userSnap.exists()) {
      await set(userRef, {
        email: user.email,
        balance: 125.50,
        createdAt: new Date().toISOString(),
        purchases: {}
      });
    }
  };

  const updateUserBalance = async (newBalance) => {
    if (user) {
      const userBalanceRef = ref(db, `users/${user.uid}/balance`);
      await set(userBalanceRef, newBalance);
    }
  };

  const addProduct = async (product) => {
    const productRef = ref(db, `products/${product.id}`);
    await set(productRef, product);
  };

  const deleteProduct = async (productId) => {
    const productRef = ref(db, `products/${productId}`);
    await remove(productRef);
  };

  const addPurchase = async (userId, productId, productName, price, stockData) => {
    const purchaseRef = push(ref(db, `users/${userId}/purchases`));
    await set(purchaseRef, {
      productId,
      productName,
      price,
      stockData,
      purchaseDate: new Date().toISOString()
    });
  };

  const updateProductStock = async (productId, newStockData) => {
    const productRef = ref(db, `products/${productId}/stockData`);
    await set(productRef, newStockData);
  };

  const banUser = async (userId, isBanned) => {
    const userRef = ref(db, `users/${userId}/banned`);
    await set(userRef, isBanned);
  };

  const addBalanceToUser = async (userId, amount) => {
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      const currentBalance = userSnap.val().balance || 0;
      const newBalance = currentBalance + amount;
      await set(ref(db, `users/${userId}/balance`), newBalance);
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Check if user is admin
      if (u && u.email === "admin@gamestore.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      if (u) {
        createUserProfile(u);
        // Listen to user balance changes
        const userBalanceRef = ref(db, `users/${u.uid}/balance`);
        const unsubscribe = onValue(userBalanceRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserBalance(snapshot.val() || 0);
          }
        });

        return () => unsubscribe();
      }
    });

    // Load products from database
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsArray = Object.values(productsData);
        setProducts(productsArray);
      } else {
        // Initialize with default products
        const defaultProducts = [
          { 
            id: Date.now() + 1, 
            name: "Call of Duty: Modern Warfare", 
            price: 59.99, 
            image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=200&h=200&fit=crop", 
            category: "Action",
            stockData: [
              { code: "COD-MW-2024-X7Y9", data: "Premium Edition Key" },
              { code: "COD-MW-2024-B3K8", data: "Standard Edition Key" }
            ]
          },
          { 
            id: Date.now() + 2, 
            name: "The Legend of Zelda", 
            price: 49.99, 
            image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop", 
            category: "Adventure",
            stockData: [
              { code: "ZELDA-ADV-5K3L", data: "Collector's Edition" },
              { code: "ZELDA-ADV-M9P2", data: "Digital Deluxe" },
              { code: "ZELDA-ADV-Q7R4", data: "Standard Edition" }
            ]
          },
          { 
            id: Date.now() + 3, 
            name: "FIFA 2024", 
            price: 39.99, 
            image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop", 
            category: "Sports",
            stockData: [
              { code: "FIFA24-SP-9M2N", data: "Ultimate Team Edition" }
            ]
          },
          { 
            id: Date.now() + 4, 
            name: "Minecraft", 
            price: 26.95, 
            image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop", 
            category: "Sandbox",
            stockData: [
              { code: "MC-SB-8P4Q", data: "Java Edition" },
              { code: "MC-SB-7N5M", data: "Bedrock Edition" },
              { code: "MC-SB-K2J6", data: "Education Edition" }
            ]
          }
        ];
        defaultProducts.forEach(product => addProduct(product));
      }
    });

    // Load all users for admin
    if (isAdmin) {
      const usersRef = ref(db, 'users');
      onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const usersArray = Object.entries(usersData).map(([key, value]) => ({
            id: key,
            ...value
          }));
          setUsers(usersArray);
        }
      });
    }
  }, [isAdmin]);

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Game Store</h2>
          <input
            className="auth-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="auth-buttons">
            <button
              className="btn-secondary"
              onClick={() => createUserWithEmailAndPassword(auth, email, password)}
            >
              Register
            </button>
            <button
              className="btn-primary"
              onClick={() => signInWithEmailAndPassword(auth, email, password)}
            >
              Login
            </button>
          </div>
          <p style={{marginTop: '20px', color: '#A0A0A0', fontSize: '14px'}}>
            Admin login: admin@gamestore.com / password: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <header className="header">
        <div className="logo">
          <span className="logo-g">Game</span>
          <span>🎮</span>
          <span className="logo-d">Store</span>
        </div>
        <div className="wallet-section">
          <div className="balance-display-header">
            <img src="/IMG_1858.webp" alt="Balance" style={{width: '16px', height: '16px', marginRight: '4px'}} />
            {userBalance.toFixed(2)}
          </div>
          <button className="wallet-btn" onClick={() => setPage("wallet")}>
            <img src="/IMG_1859.png" alt="Wallet" style={{width: '16px', height: '16px'}} />
          </button>
        </div>
        <div className="profile-section">
          <button 
            className="profile-btn" 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            👤
          </button>
          {showProfileDropdown && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-item" onClick={() => { setPage("purchases"); setShowProfileDropdown(false); }}>
                <span>🛍️</span>
                <span>My Purchases</span>
              </div>
              <div className="profile-dropdown-item" onClick={() => { signOut(auth); setShowProfileDropdown(false); }}>
                <span>🚪</span>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="content">
        {page === "home" && <HomePage products={products} userBalance={userBalance} updateUserBalance={updateUserBalance} user={user} addPurchase={addPurchase} updateProductStock={updateProductStock} />}
        {page === "wallet" && <WalletPage balance={userBalance} updateUserBalance={updateUserBalance} user={user} addBalanceToUser={addBalanceToUser} />}
        {page === "purchases" && <PurchasesPage user={user} />}
        {page === "admin" && isAdmin && <AdminPage products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProductStock={updateProductStock} users={users} banUser={banUser} addBalanceToUser={addBalanceToUser} />}
      </div>

      <nav className="nav-bar">
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${page === "home" ? "active" : ""}`}
            onClick={() => setPage("home")}
          >
            🏠 Store
          </button>
          <button 
            className={`nav-btn ${page === "wallet" ? "active" : ""}`}
            onClick={() => setPage("wallet")}
          >
            💳 Wallet
          </button>
          <button 
            className={`nav-btn ${page === "purchases" ? "active" : ""}`}
            onClick={() => setPage("purchases")}
          >
            🛍️ Purchases
          </button>
          {isAdmin && (
            <button 
              className={`nav-btn ${page === "admin" ? "active" : ""}`}
              onClick={() => setPage("admin")}
            >
              👑 Admin
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function HomePage({ products, userBalance, updateUserBalance, user, addPurchase, updateProductStock }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);

  const handleProductClick = (product) => {
    if (product.stockData && product.stockData.length > 0) {
      setSelectedProduct(product);
    } else {
      alert("This product is out of stock!");
    }
  };

  const handlePurchase = async (product, stockItem, stockIndex) => {
    try {
      if (!user) {
        alert("Please log in to make a purchase.");
        return;
      }

      if (!product.stockData || product.stockData.length === 0) {
        alert("This product is out of stock!");
        return;
      }

      if (userBalance >= product.price) {
        const newBalance = userBalance - product.price;

        // Remove purchased stock item
        const newStockData = product.stockData.filter((_, index) => index !== stockIndex);

        // Update all data in sequence
        await Promise.all([
          updateUserBalance(newBalance),
          updateProductStock(product.id, newStockData),
          addPurchase(user.uid, product.id, product.name, product.price, stockItem)
        ]);

        // Show success dialog
        setPurchaseDetails({
          productName: product.name,
          code: stockItem.code,
          data: stockItem.data,
          price: product.price
        });
        setShowSuccessDialog(true);
        setSelectedProduct(null);
      } else {
        alert("Insufficient balance! Please add funds to your wallet.");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Purchase failed. Please try again.");
    }
  };

  return (
    <div className="page-card">
      <h1 className="page-title">Game Store</h1>

      {products.length === 0 ? (
        <div className="empty-store">
          <div className="empty-icon">🎮</div>
          <h3>No Products Available</h3>
          <p>The store is currently empty. Check back later for new games!</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
              <img 
                src={product.image} 
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none', fontSize: '4rem', marginBottom: '15px' }}>🎮</div>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-category">{product.category}</p>
              <div className="product-price">
                <img src="/IMG_1858.webp" alt="Balance" style={{width: '16px', height: '16px'}} />
                {product.price}
              </div>
              <div className="product-stock">
                Stock: <span className={`stock-count ${(!product.stockData || product.stockData.length <= 2) ? 'low-stock' : ''}`}>
                  {product.stockData ? product.stockData.length : 0}
                </span>
              </div>
              <button 
                className={`buy-btn ${userBalance < product.price || !product.stockData || product.stockData.length === 0 ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProductClick(product);
                }}
                disabled={userBalance < product.price || !product.stockData || product.stockData.length === 0}
              >
                {!product.stockData || product.stockData.length === 0 ? 'Out of Stock' : 
                 userBalance >= product.price ? 'Buy' : 'Insufficient Funds'}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="purchase-dialog-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="purchase-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{selectedProduct.name}</h3>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            <div className="dialog-content">
              <div className="dialog-price">
                <img src="/IMG_1858.webp" alt="Balance" style={{width: '18px', height: '18px'}} />
                {selectedProduct.price}
              </div>
              <p>Available Stock: {selectedProduct.stockData ? selectedProduct.stockData.length : 0} items</p>
              <div className="purchase-info">
                <p>You will receive a unique product code and data after purchase.</p>
                <button 
                  className={`buy-product-btn ${userBalance < selectedProduct.price ? 'disabled' : ''}`}
                  onClick={() => {
                    if (selectedProduct.stockData && selectedProduct.stockData.length > 0) {
                      const stockItem = selectedProduct.stockData[0]; // Get first available stock
                      handlePurchase(selectedProduct, stockItem, 0);
                    }
                  }}
                  disabled={userBalance < selectedProduct.price || !selectedProduct.stockData || selectedProduct.stockData.length === 0}
                >
                  {userBalance >= selectedProduct.price ? (
                    <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                      Buy for <img src="/IMG_1858.webp" alt="Balance" style={{width: '14px', height: '14px'}} /> {selectedProduct.price}
                    </span>
                  ) : 'Insufficient Funds'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessDialog && purchaseDetails && (
        <div className="purchase-dialog-overlay" onClick={() => setShowSuccessDialog(false)}>
          <div className="success-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>🎉 Purchase Successful!</h3>
              <button className="close-btn" onClick={() => setShowSuccessDialog(false)}>×</button>
            </div>
            <div className="dialog-content">
              <div className="success-info">
                <h4>{purchaseDetails.productName}</h4>
                <p className="purchase-price">
                  <span>Paid:</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <img src="/IMG_1858.webp" alt="Balance" style={{width: '16px', height: '16px'}} />
                    {purchaseDetails.price}
                  </span>
                </p>
                <div className="product-details">
                  <div className="detail-item">
                    <strong>Product Code:</strong>
                    <div className="code-display">{purchaseDetails.code}</div>
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(purchaseDetails.code);
                        alert('Code copied to clipboard!');
                      }}
                    >
                      Copy Code
                    </button>
                  </div>
                  <div className="detail-item">
                    <strong>Product Data:</strong>
                    <div className="data-display">{purchaseDetails.data}</div>
                  </div>
                </div>
                <p className="success-note">Your purchase has been saved to your purchase history.</p>
                <button 
                  className="success-btn"
                  onClick={() => setShowSuccessDialog(false)}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletPage({ balance, updateUserBalance, user, addBalanceToUser }) {
  const [addAmount, setAddAmount] = useState('');

  const handleAddFunds = async () => {
    const amount = parseFloat(addAmount);
    if (amount && amount > 0 && user) {
      await addBalanceToUser(user.uid, amount);
      setAddAmount('');
      alert(`Successfully added $${amount} to your wallet!`);
    } else {
      alert('Please enter a valid amount');
    }
  };

  return (
    <div className="page-card">
      <h1 className="page-title">💰 My Wallet</h1>

      <div className="add-balance-section">
        <h2 className="section-title">Add Balance</h2>
        <div className="add-balance-form">
          <input
            type="number"
            placeholder="Enter amount"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            className="balance-input"
            min="0"
            step="0.01"
          />
          <button className="add-balance-btn" onClick={handleAddFunds}>
            Add Funds
          </button>
        </div>
        <div className="quick-amounts">
          <button onClick={() => setAddAmount('10')} className="quick-amount-btn">$10</button>
          <button onClick={() => setAddAmount('25')} className="quick-amount-btn">$25</button>
          <button onClick={() => setAddAmount('50')} className="quick-amount-btn">$50</button>
          <button onClick={() => setAddAmount('100')} className="quick-amount-btn">$100</button>
        </div>
      </div>

      <div className="wallet-features">
        <h2 className="section-title">Wallet Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Payment Methods</h3>
            <p>Manage your cards and payment options securely</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Transaction History</h3>
            <p>View your purchase and recharge history</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Security</h3>
            <p>Your transactions are protected with encryption</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Refunds</h3>
            <p>Get instant refunds for eligible purchases</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchasesPage({ user }) {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    if (user) {
      const purchasesRef = ref(db, `users/${user.uid}/purchases`);
      onValue(purchasesRef, (snapshot) => {
        if (snapshot.exists()) {
          const purchasesData = snapshot.val();
          const purchasesArray = Object.entries(purchasesData).map(([key, value]) => ({
            id: key,
            ...value
          })).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
          setPurchases(purchasesArray);
        } else {
          setPurchases([]);
        }
      });
    }
  }, [user]);

  return (
    <div className="page-card">
      <h1 className="page-title">My Purchases</h1>

      {purchases.length === 0 ? (
        <div className="no-purchases">
          <div className="empty-icon">🛍️</div>
          <p>No purchases yet. Visit the store to buy some games!</p>
        </div>
      ) : (
        <div className="purchases-list">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="purchase-item">
              <div className="purchase-info">
                <h4>{purchase.productName}</h4>
                <div className="purchase-details">
                  <p><strong>Code:</strong> {purchase.stockData.code}</p>
                  <p><strong>Data:</strong> {purchase.stockData.data}</p>
                  <p style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <strong>Price:</strong>
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <img src="/IMG_1858.webp" alt="Balance" style={{width: '14px', height: '14px'}} />
                      {purchase.price}
                    </span>
                  </p>
                  <p><strong>Date:</strong> {new Date(purchase.purchaseDate).toLocaleDateString()}</p>
                </div>
              </div>
              <button 
                className="copy-code-btn"
                onClick={() => {
                  navigator.clipboard.writeText(purchase.stockData.code);
                  alert('Code copied to clipboard!');
                }}
              >
                Copy Code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPage({ products, addProduct, deleteProduct, updateProductStock, users, banUser, addBalanceToUser }) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    image: '',
    category: '',
    stockData: []
  });
  const [newStockItem, setNewStockItem] = useState({ code: '', data: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      if (i === 4 || i === 8) result += '-';
      else result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const addStockItem = () => {
    if (newStockItem.code && newStockItem.data) {
      setNewProduct({
        ...newProduct,
        stockData: [...newProduct.stockData, { ...newStockItem }]
      });
      setNewStockItem({ code: '', data: '' });
    } else {
      alert('Please fill in both code and data for the stock item');
    }
  };

  const removeStockItem = (index) => {
    const updatedStockData = newProduct.stockData.filter((_, i) => i !== index);
    setNewProduct({ ...newProduct, stockData: updatedStockData });
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.price && newProduct.category && newProduct.stockData.length > 0) {
      const product = {
        id: Date.now(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        image: newProduct.image,
        category: newProduct.category,
        stockData: newProduct.stockData
      };
      await addProduct(product);
      setNewProduct({ name: '', price: '', image: '', category: '', stockData: [] });
      alert('Product added successfully!');
    } else {
      alert('Please fill in all fields and add at least one stock item');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      alert('Product deleted successfully!');
    }
  };

  const addStockToExistingProduct = async (productId, stockItem) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newStockData = [...(product.stockData || []), stockItem];
      await updateProductStock(productId, newStockData);
      alert('Stock added successfully!');
    }
  };

  const removeStockFromProduct = async (productId, stockIndex) => {
    const product = products.find(p => p.id === productId);
    if (product && product.stockData) {
      const newStockData = product.stockData.filter((_, index) => index !== stockIndex);
      await updateProductStock(productId, newStockData);
      alert('Stock removed successfully!');
    }
  };

  const handleBanUser = async (userId, currentBanStatus) => {
    await banUser(userId, !currentBanStatus);
    alert(`User ${!currentBanStatus ? 'banned' : 'unbanned'} successfully!`);
  };

  const handleAddBalanceToUser = async () => {
    const amount = parseFloat(balanceAmount);
    if (selectedUserId && amount && amount > 0) {
      await addBalanceToUser(selectedUserId, amount);
      setBalanceAmount('');
      setSelectedUserId('');
      alert(`Successfully added $${amount} to user's wallet!`);
    } else {
      alert('Please select a user and enter a valid amount');
    }
  };

  return (
    <div className="page-card">
      <h1 className="page-title">Admin Panel</h1>

      <div className="admin-section">
        <h2>Add New Product</h2>
        <div className="admin-form">
          <input
            type="text"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            className="admin-input"
          />
          <input
            type="number"
            placeholder="Price"
            value={newProduct.price}
            onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
            className="admin-input"
          />
          <input
            type="text"
            placeholder="Category"
            value={newProduct.category}
            onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
            className="admin-input"
          />
          <input
            type="url"
            placeholder="Image URL (e.g., https://example.com/image.jpg)"
            value={newProduct.image}
            onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
            className="admin-input"
          />

          <div className="stock-section">
            <h3>Add Stock Items</h3>
            <div className="stock-input-group">
              <input
                type="text"
                placeholder="GrowID"
                value={newStockItem.code}
                onChange={(e) => setNewStockItem({...newStockItem, code: e.target.value})}
                className="admin-input"
              />
              <button 
                type="button"
                className="generate-code-btn"
                onClick={() => setNewStockItem({...newStockItem, code: generateRandomCode()})}
              >
                Generate
              </button>
            </div>
            <input
              type="text"
              placeholder="Stock Data (e.g., Premium Edition Key)"
              value={newStockItem.data}
              onChange={(e) => setNewStockItem({...newStockItem, data: e.target.value})}
              className="admin-input"
            />
            <button className="admin-btn-secondary" onClick={addStockItem}>Add Stock Item</button>

            {newProduct.stockData.length > 0 && (
              <div className="codes-preview">
                <h4>Stock Items ({newProduct.stockData.length})</h4>
                {newProduct.stockData.map((item, index) => (
                  <div key={index} className="code-preview-item">
                    <div>
                      <div className="code-key">{item.code}</div>
                      <div className="code-preview-info">{item.data}</div>
                    </div>
                    <button 
                      className="remove-code-btn"
                      onClick={() => removeStockItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="admin-btn" onClick={handleAddProduct}>Add Product</button>
        </div>
      </div>

      <div className="admin-section">
        <h2>Manage Products</h2>
        <div className="admin-products">
          {products.map(product => (
            <div key={product.id} className="admin-product-card">
              <div className="admin-product-info">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                  <span style={{ display: 'none' }}>🎮</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {product.name} - 
                    <img src="/IMG_1858.webp" alt="Balance" style={{width: '14px', height: '14px'}} />
                    {product.price}
                  </span>
                </div>
                  <div className="admin-stock-info">
                    Stock: <span className={`stock-count ${(!product.stockData || product.stockData.length <= 2) ? 'low-stock' : ''}`}>
                      {product.stockData ? product.stockData.length : 0} items
                    </span>
                  </div>
                </div>

                {product.stockData && product.stockData.length > 0 && (
                  <div className="codes-info">
                    <h4>Stock Items:</h4>
                    {product.stockData.map((stockItem, index) => (
                      <div key={index} className="code-stock-item">
                        <div className="code-details">
                          <div className="code-key">{stockItem.code}</div>
                          <div className="code-data">{stockItem.data}</div>
                        </div>
                        <button 
                          className="remove-code-btn"
                          onClick={() => removeStockFromProduct(product.id, index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-product-actions">
                <button 
                  className="admin-btn-secondary"
                  onClick={() => {
                    const code = prompt("Enter product code:");
                    const data = prompt("Enter stock data:");
                    if (code && data) {
                      addStockToExistingProduct(product.id, { code, data });
                    }
                  }}
                >
                  Add Stock
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  Delete Product
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2>User Management</h2>
        
        <div className="user-balance-section">
          <h3>Add Balance to User</h3>
          <div className="user-balance-form">
            <select 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="admin-input"
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email} (Balance: ${(user.balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount to add"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              className="admin-input"
              min="0"
              step="0.01"
            />
            <button className="admin-btn" onClick={handleAddBalanceToUser}>
              Add Balance
            </button>
          </div>
        </div>

        <div className="users-list">
          <h3>All Users</h3>
          {users.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-info">
                <div className="user-email">{user.email}</div>
                <div className="user-details">
                  <span>Balance: ${(user.balance || 0).toFixed(2)}</span>
                  <span>Status: {user.banned ? '🚫 Banned' : '✅ Active'}</span>
                  <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="user-actions">
                <button 
                  className={user.banned ? "admin-btn-secondary" : "ban-btn"}
                  onClick={() => handleBanUser(user.id, user.banned)}
                >
                  {user.banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function ProfilePage({ user }) {
  return (
    <div>
      <h1>My Profile</h1>
      <p>Coming soon...</p>
    </div>
  );
}