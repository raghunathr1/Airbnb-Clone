
const express = require("express");
const mongoose = require("mongoose");

const Review = require("../models/Review");
const Listing = require("../models/Listing");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.get("/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const listing = await Listing.findById(propertyId).select("_id");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const reviews = await Review.find({ propertyId })
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    const ratingSum = reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    const averageRating =
      totalReviews > 0
        ? Math.round((ratingSum / totalReviews) * 10) / 10
        : 0;

    return res.status(200).json({
      success: true,
      count: totalReviews,
      averageRating,
      average: averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
});


router.post("/", authMiddleware, async (req, res) => {
  try {
    const { propertyId, rating, comment } = req.body || {};

    if (!propertyId || !mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid property ID.",
      });
    }

    const numericRating = Number(rating);

    if (
      rating === undefined ||
      rating === null ||
      rating === "" ||
      typeof rating === "boolean" ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    if (typeof comment !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please enter a review comment.",
      });
    }

    const cleanComment = comment.trim();

    if (cleanComment.length < 5 || cleanComment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Review must contain between 5 and 1000 characters.",
      });
    }

    const listing = await Listing.findById(propertyId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const user = await User.findById(req.user.userId).select("name");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    const review = await Review.create({
      propertyId: listing._id,
      reviewerName: user.name,
      rating: numericRating,
      comment: cleanComment,
    });

    // Recalculate the average rating after saving the review.
    const ratingStats = await Review.aggregate([
      {
        $match: {
          propertyId: listing._id,
        },
      },
      {
        $group: {
          _id: "$propertyId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const averageRating =
      ratingStats.length > 0
        ? Math.round(ratingStats[0].averageRating * 10) / 10
        : 0;

    const totalReviews =
      ratingStats.length > 0
        ? ratingStats[0].totalReviews
        : 0;

    // Save the calculated rating on the listing.
    await Listing.findByIdAndUpdate(
      listing._id,
      { rating: averageRating },
      { runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review,
      averageRating,
      average: averageRating,
      totalReviews,
    });
  } catch (error) {
    console.error("Submit review error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid review details.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit review.",
    });
  }
});

module.exports = router;
