// src/App.jsx

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"; // [cite: 205]
import { ref, onValue, get, set, push, remove } from "firebase/database"; // [cite: 206]
import { auth, db } from "./firebase"; // Assuming you centralize Firebase in a separate file
import Dialog from "./components/Dialog";
import AuthScreen from "./components/AuthScreen";
import HomePage from "./components/HomePage"; // Need to create these files
import WalletPage from "./components/WalletPage"; // Need to create these files
import PurchasesPage from "./components/PurchasesPage"; // Need to create these files
import AdminPage from "./components/AdminPage"; // Need to create these files
import "./App.css";

// ----------------------------------------------------
// Database functions are kept here for access to 'user' state
// In a larger app, these would move to a Firebase service module or context
// ----------------------------------------------------
const createUserProfile = async (user) => { /* ... existing logic ... */ }; // [cite: 214, 215, 216]
const updateUserBalance = async (db, user, newBalance) => { /* ... existing logic ... */ }; // [cite: 216, 217]
const addProduct = async (db, product) => { /* ... existing logic ... */ }; // [cite: 217, 218]
const deleteProduct = async (db, productId) => { /* ... existing logic ... */ }; // [cite: 218, 219]
const addPurchase = async (db, userId, productId, productName, price, stockData) => { /* ... existing logic ... */ }; // [cite: 219, 220, 221]
const updateProductStock = async (db, productId, newStockData) => { /* ... existing logic ... */ }; // [cite: 221, 222]
const banUser = async (db, userId, isBanned) => { /* ... existing logic ... */ }; // [cite: 222, 223]
const addBalanceToUser = async (db, userId, amount) => { /* ... existing logic ... */ }; // [cite: 223, 224, 225]


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // [cite: 209]
  const [page, setPage] = useState("home");
  const [userBalance, setUserBalance] = useState(0); // [cite: 209]
  const [products, setProducts] = useState([]); // [cite: 210]
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]); // [cite: 210]
  
  // Dialog States
  const [errorDialog, setErrorDialog] = useState({ show: false, message: '' }); // [cite: 211]
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null }); // [cite: 212]
  const [infoDialog, setInfoDialog] = useState({ show: false, title: '', message: '' }); // [cite: 213]

  // Centralized Dialog Handlers
  const showErrorDialog = (message) => setErrorDialog({ show: true, message });
  const showConfirmDialog = (message, onConfirm) => setConfirmDialog({ show: true, message, onConfirm });
  const showInfoDialog = (title, message) => setInfoDialog({ show: true, title, message }); // [cite: 263, 265]

  // Extract functions for the main component to pass down
  const boundUpdateUserBalance = (newBalance) => updateUserBalance(db, user, newBalance);
  const boundAddProduct = (product) => addProduct(db, product); // [cite: 264]
  const boundDeleteProduct = (id) => deleteProduct(db, id);
  const boundUpdateProductStock = (id, stock) => updateProductStock(db, id, stock);
  const boundBanUser = (id, banned) => banUser(db, id, banned);
  const boundAddBalanceToUser = (id, amount) => addBalanceToUser(db, id, amount);
  const boundAddPurchase = (productId, productName, price, stockData) => 
    addPurchase(db, user.uid, productId, productName, price, stockData);


  useEffect(() => {
    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { // [cite: 226, 227]
      setUser(u);
      setLoading(false);
      const isUserAdmin = u && u.email === "admin@gamestore.com";
      setIsAdmin(isUserAdmin);
      
      if (u) {
        createUserProfile(u);
        
        // Listen to user balance changes [cite: 227]
        const userBalanceRef = ref(db, `users/${u.uid}/balance`);
        const unsubscribeBalance = onValue(userBalanceRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserBalance(snapshot.val() || 0);
          }
        });

        // 2. Load all users for admin
        if (isUserAdmin) {
          const usersRef = ref(db, 'users'); // [cite: 229, 230]
          const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
              const usersData = snapshot.val();
              const usersArray = Object.entries(usersData).map(([key, value]) => ({
                id: key,
                ...value
              }));
              setUsers(usersArray); // [cite: 231]
            }
          });
          return () => { unsubscribeAuth(); unsubscribeBalance(); unsubscribeUsers(); };
        }
        return () => { unsubscribeAuth(); unsubscribeBalance(); };
      }
    });

    // 3. Load products from database
    const productsRef = ref(db, 'products'); // [cite: 228]
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsArray = Object.values(productsData);
        setProducts(productsArray); // [cite: 228]
      } else {
        setProducts([]); // [cite: 229]
      }
    });

    // Cleanup for products listener
    return () => unsubscribeProducts();
  }, []); // Empty dependency array as user state changes are handled by onAuthStateChanged [cite: 226]


  if (loading) {
    return (
      <div className="loading-container">
        {/* ... existing loading screen JSX ... */} // [cite: 233, 234]
      </div>
    );
  }

  // Use AuthScreen component for unauthenticated state
  if (!user) {
    return (
      <AuthScreen 
        auth={auth} 
        showErrorDialog={showErrorDialog} 
        showConfirmDialog={showConfirmDialog}
      />
    ); // [cite: 234, 259]
  }

  // Main App Content for authenticated user
  return (
    <>
      <header className="header sticky-header">
        {/* ... existing header JSX ... */} // [cite: 259, 260, 261]
      </header>

      <main className="main-content">
        {page === "home" && <HomePage 
          products={products} 
          userBalance={userBalance} 
          updateUserBalance={boundUpdateUserBalance} 
          user={user} 
          addPurchase={boundAddPurchase} 
          updateProductStock={boundUpdateProductStock}
          showErrorDialog={showErrorDialog}
          [cite_start]showInfoDialog={showInfoDialog} // [cite: 262, 263]
        />}
        {page === "wallet" && <WalletPage balance={userBalance} user={user} />}
        {page === "purchases" && <PurchasesPage user={user} />} // [cite: 263]
        {page === "admin" && isAdmin && <AdminPage 
          products={products} 
          addProduct={boundAddProduct} 
          deleteProduct={boundDeleteProduct} 
          updateProductStock={boundUpdateProductStock} 
          users={users} 
          banUser={boundBanUser} 
          addBalanceToUser={boundAddBalanceToUser}
          showErrorDialog={showErrorDialog}
          showConfirmDialog={showConfirmDialog}
          [cite_start]showInfoDialog={showInfoDialog} // [cite: 264, 265]
        />}
      </main>

      <nav className="nav-bar">
        {/* ... existing navigation JSX ... */} // [cite: 265, 266, 267, 268, 269]
      </nav>

      {/* Reusable Dialogs */}
      <Dialog
        isOpen={errorDialog.show}
        onClose={() => setErrorDialog({ show: false, message: '' })}
        title="Error"
        className="error"
        size="small"
      >
        {/* ... existing error dialog content ... */} // [cite: 270, 271]
      </Dialog>
      
      <Dialog
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
        title="Confirm Action"
        className="warning"
        size="small"
      >
        {/* ... existing confirm dialog content ... */} // [cite: 272, 273, 274]
      </Dialog>
      
      <Dialog
        isOpen={infoDialog.show}
        onClose={() => setInfoDialog({ show: false, title: '', message: '' })}
        title={infoDialog.title}
        size="small"
      >
        {/* ... existing info dialog content ... */} // [cite: 275, 276]
      </Dialog>
    </>
  );
}

// ----------------------------------------------------
// NOTE: You would place HomePage, WalletPage, PurchasesPage, and AdminPage 
// into their respective files (e.g., src/components/HomePage.jsx)
// ----------------------------------------------------
