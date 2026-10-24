const express = require("express");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Listing = require("../models/Listing");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const parseDateOnly = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const getValidatedDates = (checkIn, checkOut) => {
  const checkInDate = parseDateOnly(checkIn);
  const checkOutDate = parseDateOnly(checkOut);

  if (!checkInDate || !checkOutDate) {
    return {
      error: "Please provide valid dates in YYYY-MM-DD format.",
    };
  }

  if (checkOutDate <= checkInDate) {
    return {
      error: "Check-out must be after check-in.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    return {
      error: "Check-in date cannot be in the past.",
    };
  }

  return {
    checkInDate,
    checkOutDate,
  };
};

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      propertyId,
      guestName,
      guests,
      checkIn,
      checkOut,
    } = req.body || {};

    if (
      !propertyId ||
      !mongoose.isValidObjectId(propertyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid property ID.",
      });
    }

    if (
      typeof guestName !== "string" ||
      guestName.trim().length < 2 ||
      guestName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Guest name must contain between 2 and 100 characters.",
      });
    }

    if (
      guests === undefined ||
      guests === null ||
      guests === "" ||
      typeof guests === "boolean" ||
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Guests must be a positive whole number.",
      });
    }

    const guestCount = Number(guests);

    const dates = getValidatedDates(checkIn, checkOut);

    if (dates.error) {
      return res.status(400).json({
        success: false,
        message: dates.error,
      });
    }

    const { checkInDate, checkOutDate } = dates;

    const listing = await Listing.findById(propertyId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    // Ensure the guest count does not exceed the property's capacity.
    if (
      guestCount > Number(listing.guests) ||
      guestCount < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          `This property allows a maximum of ${listing.guests} guests.`,
      });
    }

    // Find confirmed bookings that overlap the requested dates.
    const conflictingBooking = await Booking.findOne({
      property: listing._id,
      status: "confirmed",
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This property is already booked for the selected dates.",
      });
    }

    // Get the guest's email from the authenticated account.
    const user = await User.findById(
      req.user.userId
    ).select("email");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (nights < 1) {
      return res.status(400).json({
        success: false,
        message: "Booking must be for at least one night.",
      });
    }

    const totalPrice = nights * Number(listing.price);

    const booking = await Booking.create({
      property: listing._id,
      guestName: guestName.trim(),
      guestEmail: user.email,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestCount,
      totalPrice,
      status: "confirmed",
    });

    await booking.populate({
      path: "property",
      select: "title location image price",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking details.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.userId
    ).select("email");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    const bookings = await Booking.find({
      guestEmail: user.email,
    })
      .populate({
        path: "property",
        select: "title location image price",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings.",
    });
  }
});

router.patch(
  "/:id/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID.",
        });
      }

      const user = await User.findById(
        req.user.userId
      ).select("email");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found. Please login again.",
        });
      }

      const booking = await Booking.findOne({
        _id: id,
        guestEmail: user.email,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found or you are not authorized to cancel it.",
        });
      }

      if (booking.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "This booking has already been cancelled.",
        });
      }

      // Cancellation is not allowed on or after check-in.
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkInDate = new Date(booking.checkIn);
      checkInDate.setHours(0, 0, 0, 0);

      if (checkInDate <= today) {
        return res.status(400).json({
          success: false,
          message:
            "This booking cannot be cancelled on or after check-in.",
        });
      }

      booking.status = "cancelled";

      await booking.save();

      await booking.populate({
        path: "property",
        select: "title location image price",
      });

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully.",
        booking,
      });
    } catch (error) {
      console.error("Cancel booking error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to cancel booking.",
      });
    }
  }
);

router.get(
  "/availability/:propertyId",
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { checkIn, checkOut } = req.query;

      if (!mongoose.isValidObjectId(propertyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property ID.",
        });
      }

      const dates = getValidatedDates(
        checkIn,
        checkOut
      );

      if (dates.error) {
        return res.status(400).json({
          success: false,
          message: dates.error,
        });
      }

      const { checkInDate, checkOutDate } = dates;

      const listing = await Listing.findById(propertyId)
        .select("_id");

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Property not found.",
        });
      }

      const conflictingBooking = await Booking.findOne({
        property: listing._id,
        status: "confirmed",
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      }).select("_id");

      const available = !conflictingBooking;

      return res.status(200).json({
        success: true,
        available,
        message: available
          ? "Property is available for the selected dates."
          : "Property is already booked for the selected dates.",
      });
    } catch (error) {
      console.error("Check availability error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check property availability.",
      });
    }
  }
);

module.exports = router;