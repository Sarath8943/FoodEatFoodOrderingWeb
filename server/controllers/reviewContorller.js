const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const MenuItems = require('../models/menuItemModel');
const Review = require('../models/reviewModel');
const Restaurant = require('../models/restaurantModel');
const { calculateAverageRating } = require('../utils/ratingUtils');

exports.addReview = async (req, res) => {
  try {
    const {username, restaurantId, orderId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if userId exists
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the order
    const order = await Order.findById(orderId).populate("cartId");

    let isMatch = false;
    // Check if the order contains a menu item from the restaurant
    order.cartId.items.some((item) => {
      if (item.foodId.restaurant.toString() === restaurantId.toString()) {
        isMatch = true;
      }
      return isMatch;
    });

    // If order status is not 'delivered', reject the review
    if (order.status !== "delivered") {
      return res.status(400).json({
        message:
          "Your order is not delivered, please try once order is delivered",
      });
    }

    // Check if the user has already reviewed this restaurant for the given order
    const existingReview = await Review.findOne({
      user: userId,
      restaurantId: restaurantId,
      orderId: orderId,
      username
    });

    if (existingReview) {
      return res.status(400).json({
        message:
          "You can only submit one review per delivered order for this restaurant.",
      });
    }

    // If no item is found from this restaurant, reject
    if (!isMatch) {
      return res.status(400).json({
        message: "No items from this restaurant in your order",
      });
    }

    // Create the new review
    const newReview = new Review({
      user: userId,
      restaurantId: restaurantId, // Changed to restaurantId
      rating,
      comment,
      name:username,
    });

    // Save the review
    const savedReview = await newReview.save();

    // Update the restaurant's average rating
    const averageRatingRestaurant = await calculateAverageRating(Restaurant, restaurantId);
    
    // Update restaurant's rating in the database
    await Restaurant.findByIdAndUpdate(restaurantId, { rating: averageRatingRestaurant });

    res.status(201).json({ message: "Review submitted successfully", savedReview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






























// Create a new review
// exports.addReview = async (req, res) => {
//     try {
//       const { restaurantId,orderId, rating, comment } = req.body;
//       const userId = req.user.id;
      

//       if (!userId) {
//         return res.status(400).json({ message: "User ID is required" });
//       }
  
//       const found= await MenuItems.findById(menuItems);
//       if (!foundMenuItem) {
//         return res.status(404).json({ message: "MenuItem not found" });
//       }

//       const order = await Order.findById(orderId).populate("cartId");
//     let isMatch;
//     order.cartId.items.some((item) => {
//       isMatch = item.foodId.toString() === menuId.toString();
//       return isMatch;
//     });
//     if (order.status !== "delivered") {
//       return res.status(400).json({
//         message:
//           "Your order is not delivered, please try once order is delivered",
//       });
//     }
//     const existingReview = await Review.findOne({
//       user: user,
//       menuId: menuId,
//       orderId: orderId,
//     });

//     if (existingReview) {
//       return res.status(400).json({
//         message:
//           "You can only submit one review per delivered order for this menu item.",
//       });
//     }
//     if (!isMatch) {
//       return res.status(400).json({
//         message: "Item not found in order",
//       });
//     }
  
//       const newReview = new Review({
//         user: userId,
//         menuItems,
//         rating,
//         comment,
//       });
  
//       const savedReview = await newReview.save();

//       foundMenuItem.customerReviews.push(savedReview._id);

//       const averageRatingMenu = await calculateAverageRating(MenuItems,menuItems);
//       foundMenuItem.rating = averageRatingMenu;

//       const restaurantId = foundMenuItem.restaurant;
//       const averageRatingRestaurant = await calculateAverageRating(Restaurant,restaurantId);
//       await Restaurant.findByIdAndUpdate(restaurantId,{rating: averageRatingRestaurant});
      
//       await foundMenuItem.save();
//       await savedReview.populate("menuItems","name price");

//       res.status(201).json({message:"Review submitted successfully",savedReview});
//     } catch (error) {
//       res.status(500).json({ message:error.message });
//     }
//   };
  
  // Get all reviews
exports.getAllReviews = async (req, res) => {
    try {
      const reviews = await Review.find()
        .populate("user", "email") 
        .populate("menuItems", "name");
  
      res.status(200).json(reviews);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  
  // Delete a review
exports.deleteReview = async (req, res) => {
  try {
  
    const userId = req.user.id;
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) {
        return res.status(404).json({ message: "Review not found " });
    }
    
    const menuItem = await MenuItems.findById(review.menuItems);

    const itemIndex = menuItem.customerReviews.findIndex((item) => item.toString() === review._id.toString());
     
    if(itemIndex > -1){
      menuItem.customerReviews.splice(itemIndex,1);
    }
    await menuItem.save();
    
    await Review.findByIdAndDelete(reviewId);
    

    res.status(200).json({ message: "Review deleted successfully" });
} catch (error) {
    res.status(500).json({ message:error.message });
}
  };
