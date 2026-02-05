const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const passport = require('passport');


const verifyToken = passport.authenticate('jwt', { session: false });


router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('seller', 'name email');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/seller', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: "Access denied" });
        }
        const products = await Product.find({ seller: req.user.id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: "Only sellers can add products" });
        }

        const { name, base_description, price, stock_quantity } = req.body;
        
        const newProduct = new Product({
            name,
            base_description,
            price,
            stock_quantity,
            seller: req.user.id
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.put('/:id', verifyToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        Object.assign(product, req.body);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.delete('/:id', verifyToken, async (req, res) => {
     try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await product.deleteOne(); 
        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
