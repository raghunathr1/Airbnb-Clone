const dns = require("dns");

// DNS workaround
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
require("dotenv").config();

const Listing = require("./models/Listing");

const coordinates = [
  {
    title: "Luxury Sea View Apartment",
    latitude: 15.4909,
    longitude: 73.8278,
  },
  {
    title: "Cozy Mountain Cottage",
    latitude: 32.2396,
    longitude: 77.1887,
  },
  {
    title: "Modern City Apartment",
    latitude: 19.076,
    longitude: 72.8777,
  },
];

async function seedCoordinates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    for (const item of coordinates) {
      const result = await Listing.findOneAndUpdate(
        { title: item.title },
        {
          $set: {
            latitude: item.latitude,
            longitude: item.longitude,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (result) {
        console.log(`Coordinates updated: ${result.title}`);
      } else {
        console.log(`Listing not found: ${item.title}`);
      }
    }
  } catch (error) {
    console.error("Coordinate update failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedCoordinates();