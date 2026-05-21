import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { 
  User, 
  signInAnonymously,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, getDb, handleFirestoreError, OperationType } from "../lib/firebase";
import { useUserStore } from "../store/userStore";

interface FirebaseSyncContextType {
  firebaseUser: User | null;
  isSyncing: boolean;
  isCloudLoaded: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const FirebaseSyncContext = createContext<FirebaseSyncContextType | null>(null);

export const useFirebaseSync = () => {
  const context = useContext(FirebaseSyncContext);
  if (!context) {
    throw new Error("useFirebaseSync must be used within a FirebaseSyncProvider");
  }
  return context;
};

export default function FirebaseSyncProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Guard to prevent write recursion loops when updating local state from cloud snapshots
  const isSyncingFromCloudRef = useRef(false);

  // 1. Auth Listener & Auto-Anonymous-Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        console.log("Firebase User Authenticated:", user.uid);
      } else {
        setFirebaseUser(null);
        setIsCloudLoaded(false);
        // Automatic anonymous sign-in for seamless data storage
        try {
          setIsSyncing(true);
          await signInAnonymously(auth);
        } catch (err: any) {
          console.error("Anonymous authentication failed", err.message);
          setAuthError("Data storage initialization failed. Please reload.");
        } finally {
          setIsSyncing(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Sync & Local State Merging
  useEffect(() => {
    if (!firebaseUser) return;

    const userDocRef = doc(getDb(), "users", firebaseUser.uid);

    const unsubscribeSnap = onSnapshot(
      userDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          
          if (cloudData) {
            // Set sync guard flag to true so local Zustand subscription doesn't re-trigger a setDoc loop
            isSyncingFromCloudRef.current = true;
            
            useUserStore.setState({
              user: cloudData.user,
              resources: cloudData.resources,
              crew: cloudData.crew,
              base: cloudData.base,
              purchases: cloudData.purchases || [],
              unlockedTabs: cloudData.unlockedTabs || ["daily"],
            });

            // Keep current local state updated inside localStorage as backup
            localStorage.setItem(
              "cluevault_game_state_zustand",
              JSON.stringify({
                user: cloudData.user,
                resources: cloudData.resources,
                crew: cloudData.crew,
                base: cloudData.base,
                purchases: cloudData.purchases || [],
                unlockedTabs: cloudData.unlockedTabs || ["daily"],
              })
            );

            isSyncingFromCloudRef.current = false;
            setIsCloudLoaded(true);
          }
        } else {
          // Document doesn't exist yet on Cloud Firestore.
          // Save the current local state to Firestore as the initial master record
          try {
            const currentLocal = useUserStore.getState();
            const initialPayload = {
              userId: firebaseUser.uid,
              user: {
                name: currentLocal.user.name || firebaseUser.displayName || "Agent",
                level: currentLocal.user.level || 1,
                streak: currentLocal.user.streak || 1,
                completedToday: currentLocal.user.completedToday || false,
                avatar: currentLocal.user.avatar || firebaseUser.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
                onboarded: currentLocal.user.onboarded || false,
              },
              resources: currentLocal.resources,
              crew: currentLocal.crew,
              base: currentLocal.base,
              purchases: currentLocal.purchases || [],
              unlockedTabs: currentLocal.unlockedTabs,
              updatedAt: serverTimestamp(),
            };

            await setDoc(userDocRef, initialPayload);
            setIsCloudLoaded(true);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      }
    );

    return () => unsubscribeSnap();
  }, [firebaseUser]);

  // 3. Keep Firestore updated on local actions/changes
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribeZustand = useUserStore.subscribe(async (state) => {
      // If we are currently populating a cloud snapshot, do not save back to cloud
      if (isSyncingFromCloudRef.current) return;

      const userDocRef = doc(getDb(), "users", firebaseUser.uid);
      try {
        const payload = {
          userId: firebaseUser.uid,
          user: state.user,
          resources: state.resources,
          crew: state.crew,
          base: state.base,
          purchases: state.purchases || [],
          unlockedTabs: state.unlockedTabs,
          updatedAt: serverTimestamp(),
        };
        await setDoc(userDocRef, payload);
      } catch (err) {
        console.error("Failed to push local update to cloud", err);
      }
    });

    return () => unsubscribeZustand();
  }, [firebaseUser]);

  return (
    <FirebaseSyncContext.Provider
      value={{
        firebaseUser,
        isSyncing,
        isCloudLoaded,
        authError,
        setAuthError,
      }}
    >
      {children}
    </FirebaseSyncContext.Provider>
  );
}
