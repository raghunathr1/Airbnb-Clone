
const express = require("express");
const mongoose = require("mongoose");

const Listing = require("../models/Listing");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const ALLOWED_CATEGORIES = [
  "Amazing views",
  "Beachfront",
  "Cabins",
  "Countryside",
];

const EDITABLE_FIELDS = [
  "title",
  "description",
  "location",
  "price",
  "image",
  "bedrooms",
  "guests",
  "category",
  "latitude",
  "longitude",
];

const REQUIRED_FIELDS = [
  "title",
  "description",
  "location",
  "price",
  "image",
  "bedrooms",
  "guests",
  "category",
];

// ======================================================
// VALIDATE LISTING DATA
// Latitude and longitude are optional.
// Host and rating cannot be changed through the request.
// ======================================================
const prepareListingData = (body, isCreate = false) => {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      error: "Please provide valid property details.",
    };
  }

  if (isCreate) {
    const missingField = REQUIRED_FIELDS.find((field) => {
      const value = body[field];

      return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      );
    });

    if (missingField) {
      return {
        error: `Please provide ${missingField}.`,
      };
    }
  }

  const data = {};

  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  // Validate text fields.
  for (const field of [
    "title",
    "description",
    "location",
    "image",
  ]) {
    if (data[field] !== undefined) {
      if (
        typeof data[field] !== "string" ||
        !data[field].trim()
      ) {
        return {
          error: `${field} must be a non-empty string.`,
        };
      }

      data[field] = data[field].trim();
    }
  }

  // Validate price.
  if (data.price !== undefined) {
    if (
      data.price === "" ||
      data.price === null ||
      typeof data.price === "boolean"
    ) {
      return {
        error: "Please enter a valid price.",
      };
    }

    const price = Number(data.price);

    if (!Number.isFinite(price) || price <= 0) {
      return {
        error: "Price must be greater than zero.",
      };
    }

    data.price = price;
  }

  // Validate bedrooms and guests.
  for (const field of ["bedrooms", "guests"]) {
    if (data[field] !== undefined) {
      if (
        data[field] === "" ||
        data[field] === null ||
        typeof data[field] === "boolean"
      ) {
        return {
          error: `${field} must be a positive whole number.`,
        };
      }

      const value = Number(data[field]);

      if (!Number.isInteger(value) || value < 1) {
        return {
          error: `${field} must be a positive whole number.`,
        };
      }

      data[field] = value;
    }
  }

  // Validate category.
  if (data.category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(data.category)) {
      return {
        error: "Please select a valid property category.",
      };
    }
  }

  // Latitude is optional.
  if (data.latitude !== undefined) {
    if (
      data.latitude === "" ||
      data.latitude === null ||
      typeof data.latitude === "boolean"
    ) {
      return {
        error: "Please enter a valid latitude.",
      };
    }

    const latitude = Number(data.latitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return {
        error: "Latitude must be between -90 and 90.",
      };
    }

    data.latitude = latitude;
  }

  // Longitude is optional.
  if (data.longitude !== undefined) {
    if (
      data.longitude === "" ||
      data.longitude === null ||
      typeof data.longitude === "boolean"
    ) {
      return {
        error: "Please enter a valid longitude.",
      };
    }

    const longitude = Number(data.longitude);

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return {
        error: "Longitude must be between -180 and 180.",
      };
    }

    data.longitude = longitude;
  }

  return { data };
};

// ======================================================
// GET ALL LISTINGS
// Public
// GET /api/listings
// ======================================================
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Fetch all listings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties.",
    });
  }
});

// ======================================================
// GET MY LISTINGS
// Hosts see their own properties.
// Admins see all properties.
// IMPORTANT: Place before GET /:id.
// GET /api/listings/mine
// ======================================================
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId
    ).select("role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    if (!["host", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only hosts and admins can access this dashboard.",
      });
    }

    const filter =
      user.role === "admin"
        ? {}
        : { host: user._id };

    const listings = await Listing.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Fetch my listings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties.",
    });
  }
});

// ======================================================
// GET SINGLE LISTING
// Public
// GET /api/listings/:id
// ======================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("Fetch single listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch property details.",
    });
  }
});

// ======================================================
// CREATE LISTING
// Only host and admin
// POST /api/listings
// ======================================================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId
    ).select("role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    if (!["host", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only hosts and admins can add properties.",
      });
    }

    const { data, error } = prepareListingData(
      req.body,
      true
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    // Set owner from the authenticated account.
    // Ignore any host ID sent by the client.
    const listing = await Listing.create({
      ...data,
      host: user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully.",
      listing,
    });
  } catch (error) {
    console.error("Create listing error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid property details.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create property.",
    });
  }
});

// ======================================================
// UPDATE LISTING
// Only the owner or admin
// PUT /api/listings/:id
// ======================================================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const user = await User.findById(
      req.user.userId
    ).select("role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const isAdmin = user.role === "admin";

    const isOwner =
      listing.host &&
      listing.host.toString() === user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this property.",
      });
    }

    const body = req.body || {};
    const suppliedFields = Object.keys(body);

    const invalidFields = suppliedFields.filter(
      (field) => !EDITABLE_FIELDS.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          `These fields cannot be updated: ${invalidFields.join(", ")}.`,
      });
    }

    const { data, error } = prepareListingData(
      body,
      false
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    Object.assign(listing, data);

    await listing.save();

    return res.status(200).json({
      success: true,
      message: "Property updated successfully.",
      listing,
    });
  } catch (error) {
    console.error("Update listing error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid property details.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update property.",
    });
  }
});

// ======================================================
// DELETE LISTING
// Only the owner or admin
// A property with booking history cannot be deleted.
// DELETE /api/listings/:id
// ======================================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const user = await User.findById(
      req.user.userId
    ).select("role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const isAdmin = user.role === "admin";

    const isOwner =
      listing.host &&
      listing.host.toString() === user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to delete this property.",
      });
    }

    // Preserve booking history, including cancelled bookings.
    const existingBooking = await Booking.exists({
      property: listing._id,
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This property has booking history and cannot be deleted.",
      });
    }

    // Remove associated reviews and then the property.
    await Review.deleteMany({
      propertyId: listing._id,
    });

    await Listing.findByIdAndDelete(listing._id);

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully.",
      propertyId: id,
    });
  } catch (error) {
    console.error("Delete listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete property.",
    });
  }
});

module.exports = router;
