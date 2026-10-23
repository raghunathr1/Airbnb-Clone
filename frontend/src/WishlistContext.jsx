import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const WishlistContext = createContext(null);

const STORAGE_KEY = "airbnb-clone-wishlist";

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Unable to load wishlist:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(wishlist)
      );
    } catch (error) {
      console.error("Unable to save wishlist:", error);
    }
  }, [wishlist]);

  const isWishlisted = (propertyId) =>
    wishlist.some(
      (property) => property._id === propertyId
    );

  const toggleWishlist = (property) => {
    const propertyId = property?._id;

    if (!propertyId) {
      console.error("Property ID is missing.");
      return;
    }

    setWishlist((currentWishlist) => {
      const alreadySaved = currentWishlist.some(
        (item) => item._id === propertyId
      );

      if (alreadySaved) {
        return currentWishlist.filter(
          (item) => item._id !== propertyId
        );
      }

      return [...currentWishlist, property];
    });
  };

  const removeFromWishlist = (propertyId) => {
    setWishlist((currentWishlist) =>
      currentWishlist.filter(
        (property) => property._id !== propertyId
      )
    );
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider."
    );
  }

  return context;
}