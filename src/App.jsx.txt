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
import Dialog from "./Dialog";
import "./App.css";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userBalance, setUserBalance] = useState(0);
  const [products, setProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [errorDialog, setErrorDialog] = useState({ show: false, message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [infoDialog, setInfoDialog] = useState({ show: false, title: '', message: '' });

  // Database functions
  const createUserProfile = async (user) => {
    const userRef = ref(db, `users/${user.uid}`);
    const userSnap = await get(userRef);

    if (!userSnap.exists()) {
      await set(userRef, {
        email: user.email,
        balance: 0,
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
      setLoading(false);
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
        // No products in Firebase - start with empty array
        setProducts([]);
      }
    });

    // Load all users for admin
    const loadUsers = () => {
      if (user && user.email === "admin@gamestore.com") {
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
    };

    loadUsers();
  }, [user]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-logo">
            <span className="logo-g">Grow4</span>
            <span className="logo-d">Bot</span>
          </div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleLogin = async () => {
      if (!email || !password) {
        setErrorDialog({ show: true, message: 'Please enter both email and password' });
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setErrorDialog({ show: true, message: 'Login failed: ' + error.message });
      }
    };

    const handleRegister = async () => {
      if (!email || !password) {
        setErrorDialog({ show: true, message: 'Please enter both email and password' });
        return;
      }
      if (password.length < 6) {
        setErrorDialog({ show: true, message: 'Password must be at least 6 characters long' });
        return;
      }
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setErrorDialog({ show: true, message: 'Registration failed: ' + error.message });
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    };

    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="logo-g">Grow4</span>
              <span className="logo-d">Bot</span>
            </div>
            <h2 className="auth-subtitle">Welcome Back</h2>
            <p className="auth-description">Sign in to your account to continue</p>
          </div>

          <div className="auth-form">
            <div className="input-group">
              <input
                className="auth-input"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <span className="input-icon">📧</span>
            </div>

            <div className="input-group">
              <input
                className="auth-input"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <span className="input-icon">🔒</span>
            </div>

            <div className="auth-buttons">
              <button
                className="btn-primary"
                onClick={handleLogin}
                disabled={!email || !password}
              >
                Sign In
              </button>
              <button
                className="btn-secondary"
                onClick={handleRegister}
                disabled={!email || !password}
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="auth-footer">
            <div className="demo-info">
              <p className="demo-label">Demo Account</p>
              <p className="demo-credentials">admin@gamestore.com / admin123</p>
            </div>
          </div>
        </div>

        <Dialog
          isOpen={errorDialog.show}
          onClose={() => setErrorDialog({ show: false, message: '' })}
          title="Error"
          className="error"
          size="small"
        >
          <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{errorDialog.message}</p>
          <button 
            className="btn-primary"
            onClick={() => setErrorDialog({ show: false, message: '' })}
            style={{ width: '100%', marginTop: '15px' }}
          >
            OK
          </button>
        </Dialog>

        <Dialog
          isOpen={confirmDialog.show}
          onClose={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
          title="Confirm Action"
          className="warning"
          size="small"
        >
          <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{confirmDialog.message}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              className="btn-secondary"
              onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button 
              className="btn-primary"
              onClick={() => {
                if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                setConfirmDialog({ show: false, message: '', onConfirm: null });
              }}
              style={{ flex: 1 }}
            >
              Confirm
            </button>
          </div>
        </Dialog>

        <Dialog
          isOpen={infoDialog.show}
          onClose={() => setInfoDialog({ show: false, title: '', message: '' })}
          title={infoDialog.title}
          size="medium"
        >
          <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{infoDialog.message}</p>
          <button 
            className="btn-primary"
            onClick={() => setInfoDialog({ show: false, title: '', message: '' })}
            style={{ width: '100%', marginTop: '15px' }}
          >
            OK
          </button>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <header className="header sticky-header">
        <div className="logo">
          <span className="logo-g">Grow4</span>
          <span className="logo-d">Bot</span>
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
            onClick={() => signOut(auth)}
            title="Logout"
          >
            <img src="/IMG_1872.png" alt="Profile" style={{width: '24px', height: '24px', borderRadius: '50%'}} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {page === "home" && <HomePage 
          products={products} 
          userBalance={userBalance} 
          updateUserBalance={updateUserBalance} 
          user={user} 
          addPurchase={addPurchase} 
          updateProductStock={updateProductStock}
          showErrorDialog={(message) => setErrorDialog({ show: true, message })}
          showInfoDialog={(title, message) => setInfoDialog({ show: true, title, message })}
        />}
        {page === "wallet" && <WalletPage balance={userBalance} user={user} />}
        {page === "purchases" && <PurchasesPage 
          user={user}
          showInfoDialog={(title, message) => setInfoDialog({ show: true, title, message })}
        />}
        {page === "admin" && isAdmin && <AdminPage 
          products={products} 
          addProduct={addProduct} 
          deleteProduct={deleteProduct} 
          updateProductStock={updateProductStock} 
          users={users} 
          banUser={banUser} 
          addBalanceToUser={addBalanceToUser}
          showErrorDialog={(message) => setErrorDialog({ show: true, message })}
          showConfirmDialog={(message, onConfirm) => setConfirmDialog({ show: true, message, onConfirm })}
          showInfoDialog={(title, message) => setInfoDialog({ show: true, title, message })}
        />}
      </main>

      <nav className="nav-bar">
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${page === "home" ? "active" : ""}`}
            onClick={() => setPage("home")}
          >
            <img src="/icons8-home-50.png" alt="Home" style={{width: '24px', height: '24px'}} />
          </button>
          <button 
            className={`nav-btn ${page === "wallet" ? "active" : ""}`}
            onClick={() => setPage("wallet")}
          >
            <img src="/IMG_1859.png" alt="Wallet" style={{width: '24px', height: '24px'}} />
          </button>
          <button 
            className={`nav-btn ${page === "purchases" ? "active" : ""}`}
            onClick={() => setPage("purchases")}
          >
            <img src="/icons8-purchase-60.png" alt="Purchases" style={{width: '24px', height: '24px'}} />
          </button>
          {isAdmin && (
            <button 
              className={`nav-btn ${page === "admin" ? "active" : ""}`}
              onClick={() => setPage("admin")}
            >
              <img src="/IMG_1871.png" alt="Admin" style={{width: '24px', height: '24px'}} />
            </button>
          )}
        </div>
      </nav>

      <Dialog
        isOpen={errorDialog.show}
        onClose={() => setErrorDialog({ show: false, message: '' })}
        title="Error"
        className="error"
        size="small"
      >
        <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{errorDialog.message}</p>
        <button 
          className="btn-primary"
          onClick={() => setErrorDialog({ show: false, message: '' })}
          style={{ width: '100%', marginTop: '15px' }}
        >
          OK
        </button>
      </Dialog>

      <Dialog
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
        title="Confirm Action"
        className="warning"
        size="small"
      >
        <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{confirmDialog.message}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            className="btn-secondary"
            onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={() => {
              if (confirmDialog.onConfirm) confirmDialog.onConfirm();
              setConfirmDialog({ show: false, message: '', onConfirm: null });
            }}
            style={{ flex: 1 }}
          >
            Confirm
          </button>
        </div>
      </Dialog>

      <Dialog
        isOpen={infoDialog.show}
        onClose={() => setInfoDialog({ show: false, title: '', message: '' })}
        title={infoDialog.title}
        size="small"
      >
        <p style={{ color: 'white', margin: '10px 0', textAlign: 'center' }}>{infoDialog.message}</p>
        <button 
          className="btn-primary"
          onClick={() => setInfoDialog({ show: false, title: '', message: '' })}
          style={{ width: '100%', marginTop: '15px' }}
        >
          OK
        </button>
      </Dialog>
    </>
  );
}

function HomePage({ products, userBalance, updateUserBalance, user, addPurchase, updateProductStock, showErrorDialog, showInfoDialog }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);

  const handleProductClick = (product) => {
    if (product.stockData && product.stockData.length > 0) {
      setSelectedProduct(product);
    } else {
      showErrorDialog("This product is out of stock!");
    }
  };

  const handlePurchase = async (product, stockItem, stockIndex) => {
    try {
      if (!user) {
        showErrorDialog("Please log in to make a purchase.");
        return;
      }

      if (!product.stockData || product.stockData.length === 0) {
        showErrorDialog("This product is out of stock!");
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
        showErrorDialog("Insufficient balance! Please add funds to your wallet.");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      showErrorDialog("Purchase failed. Please try again.");
    }
  };

  return (
    <div className="page-card">
      <h1 className="page-title">Grow4Bot</h1>

      {products.length === 0 ? (
        <div className="empty-store">
          <div className="empty-icon">🎮</div>
          <h3>No Products Available</h3>
          <p>The store is currently empty. Check back later for new items!</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => {
            const stockCount = product.stockData ? product.stockData.length : 0;
            const stockStatus = stockCount === 0 ? 'out-of-stock' : stockCount <= 2 ? 'low-stock' : '';
            
            return (
              <div key={product.id} className="product-card">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="product-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none', fontSize: '3rem' }}>🎮</div>
                
                <div className="product-info">
                  <div className="product-header">
                    <div className="product-title-section">
                      <div className={`product-stock-badge ${stockStatus}`}>
                        ● STOCK: {stockCount}
                      </div>
                      <span className="product-category">Medium Profit</span>
                    </div>
                  </div>
                  
                  <h3 className="product-name">{product.name}</h3>
                  
                  <div className="product-price">
                    <img src="/IMG_1858.webp" alt="Balance" style={{width: '18px', height: '18px'}} />
                    {product.price}
                  </div>
                </div>
                
                <div className="product-actions">
                  <button 
                    className={`buy-btn ${userBalance < product.price || !product.stockData || product.stockData.length === 0 ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                    disabled={userBalance < product.price || !product.stockData || product.stockData.length === 0}
                  >
                    {!product.stockData || product.stockData.length === 0 ? 'Out of Stock' : 
                     userBalance >= product.price ? 'Buy' : 'Insufficient'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || ''}
        size="medium"
      >
        {selectedProduct && (
          <>
            <div className="dialog-price">
              <img src="/IMG_1858.webp" alt="Balance" style={{width: '18px', height: '18px'}} />
              {selectedProduct.price}
            </div>
            <div className="stock-info">
              Available Stock: {selectedProduct.stockData ? selectedProduct.stockData.length : 0} items
            </div>
            <div className="purchase-preview">
              You will receive a unique product code and data after purchase.
            </div>
            <div className="purchase-info">
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
          </>
        )}
      </Dialog>

      <Dialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Purchase Successful"
        size="medium"
      >
        <div className="dialog-price">
          <img src="/IMG_1858.webp" alt="Balance" style={{width: '18px', height: '18px'}} />
          {purchaseDetails?.price}
        </div>
        <div className="stock-info">
          Available Stock: 1 items
        </div>
        <div className="purchase-preview">
          Your purchase has been saved to your purchase history.
        </div>
        <div className="purchase-info">
          <button 
            className="buy-product-btn"
            onClick={() => setShowSuccessDialog(false)}
          >
            Continue Shopping
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function WalletPage({ balance, user }) {
  return (
    <div className="page-card">
      <h1 className="page-title">💰 My Wallet</h1>

      <div className="user-uid-section">
        <h2 className="section-title">Your User ID</h2>
        <div className="uid-display">
          <span className="uid-label">UID:</span>
          <span className="uid-value">{user?.uid || 'Not available'}</span>
          <button 
            className="copy-uid-btn"
            onClick={() => {
              if (user?.uid) {
                navigator.clipboard.writeText(user.uid);
                alert('UID copied to clipboard!');
              }
            }}
          >
            Copy
          </button>
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
  const [products, setProducts] = useState([]);

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

    // Load products to get images
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsArray = Object.values(productsData);
        setProducts(productsArray);
      }
    });
  }, [user]);

  const getProductImage = (productId, productName) => {
    const product = products.find(p => p.id === productId || p.name === productName);
    return product?.image || null;
  };



  return (
    <div className="page-card">
      <h1 className="page-title">🛍️ My Purchases</h1>

      {purchases.length === 0 ? (
        <div className="no-purchases">
          <div className="empty-icon">🛍️</div>
          <h3>No Purchases Yet</h3>
          <p>Visit the store to buy some amazing items!</p>
        </div>
      ) : (
        <>
          <div className="purchase-header">
            <div className="purchases-count">
              {purchases.length} Purchase{purchases.length !== 1 ? 's' : ''}
            </div>
          </div>



          <div className="purchases-list">
            {purchases.map((purchase) => {
              const productImage = getProductImage(purchase.productId, purchase.productName);

              return (
                <div key={purchase.id} className="purchase-item">
                  <div className="purchase-header-section">
                    <img 
                      src={productImage} 
                      alt={purchase.productName}
                      className="purchase-product-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="purchase-product-fallback">🎮</div>
                    <div className="purchase-header-info">
                      <h4>{purchase.productName}</h4>
                      <div className="purchase-price-display">
                        <img src="/IMG_1858.webp" alt="Balance" style={{width: '16px', height: '16px'}} />
                        {purchase.price}
                      </div>
                    </div>
                  </div>

                  <div className="purchase-details">
                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">GrowID/Gmail</span>
                      <div 
                        className="purchase-code"
                        onClick={() => {
                          navigator.clipboard.writeText(purchase.stockData.code);
                          alert('Code copied to clipboard!');
                        }}
                        title="Click to copy"
                      >
                        {purchase.stockData.code}
                      </div>
                    </div>

                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Password</span>
                      <div className="purchase-data">{purchase.stockData.data}</div>
                    </div>

                    <div className="purchase-detail-row">
                      <span className="purchase-detail-label">Purchase Date</span>
                      <div className="purchase-date-info">
                        {new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="copy-code-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(purchase.stockData.code);
                      alert('Code copied to clipboard!');
                    }}
                  >
                    📋 Copy Code
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AdminPage({ products, addProduct, deleteProduct, updateProductStock, users, banUser, addBalanceToUser, showErrorDialog, showConfirmDialog, showInfoDialog }) {
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
      showErrorDialog('Please fill in both code and data for the stock item');
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
      showInfoDialog('Success', 'Product added successfully!');
    } else {
      showErrorDialog('Please fill in all fields and add at least one stock item');
    }
  };

  const handleDeleteProduct = async (id) => {
    showConfirmDialog('Are you sure you want to delete this product?', async () => {
      try {
        await deleteProduct(id);
        showInfoDialog('Success', 'Product deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        showErrorDialog('Failed to delete product. Please try again.');
      }
    });
  };

  const addStockToExistingProduct = async (productId, stockItem) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newStockData = [...(product.stockData || []), stockItem];
      await updateProductStock(productId, newStockData);
      showInfoDialog('Success', 'Stock added successfully!');
    }
  };

  const removeStockFromProduct = async (productId, stockIndex) => {
    const product = products.find(p => p.id === productId);
    if (product && product.stockData) {
      const newStockData = product.stockData.filter((_, index) => index !== stockIndex);
      await updateProductStock(productId, newStockData);
      showInfoDialog('Success', 'Stock removed successfully!');
    }
  };

  const handleBanUser = async (userId, currentBanStatus) => {
    await banUser(userId, !currentBanStatus);
    showInfoDialog('Success', `User ${!currentBanStatus ? 'banned' : 'unbanned'} successfully!`);
  };

  const handleAddBalanceToUser = async () => {
    const amount = parseFloat(balanceAmount);
    if (selectedUserId && amount && amount > 0) {
      await addBalanceToUser(selectedUserId, amount);
      setBalanceAmount('');
      setSelectedUserId('');
      showInfoDialog('Success', `Successfully added $${amount} to user's wallet!`);
    } else {
      showErrorDialog('Please select a user and enter a valid amount');
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
                placeholder="GrowID/Gmail"
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
              placeholder="Password"
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
                    const code = prompt("Enter GrowID/Gmail:");
                    const data = prompt("Enter Password:");
                    if (code && data) {
                      addStockToExistingProduct(product.id, { code, data });
                    } else {
                      showErrorDialog('Please enter both code and data');
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
              <option value="">Select User by UID</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  UID: {user.id} - {user.email} (Balance: ${(user.balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter UID directly"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="admin-input"
            />
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
                <div className="user-uid">
                  UID: {user.id}
                  <button 
                    className="copy-uid-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      alert('UID copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
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
