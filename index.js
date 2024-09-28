const port = 4000;
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import dotenv from "dotenv"
const app = express();
// import { uploadOnCloudinary } from "./untils/cloudinary.js";
app.use(express.json());
app.use(cors());

dotenv.config({
  path: './env'
})
// Database  connection

mongoose.connect(
  `${process.env.MONGODB_URI}`
);

app.get("/", (req, res) => {
  res.send("Express app is Running");
});

// image storage

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb) =>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({ storage: storage });

app.use("/images", express.static("upload/images"));

// app.post("/upload", upload.single("product"), async (req,res) => {
//     const avatarLocalPath = `${req.file.path}`;
//     const awatar = await uploadOnCloudinary(avatarLocalPath)
//     console.log(`${awatar} hello`);
//   })



app.post("/upload",upload.single('product'),async(req,res)=>{
    res.json({
        success:1,
        image_url:`https://ecommerce-backend-27wa.onrender.com/images/${req.file.filename}`,
    })
})

// product schema

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    require: true,
  },
  image: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
  new_price: {
    type: Number,
    require: true,
  },
  old_price: {
    type: Number,
    require: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  avilable: {
    type: Boolean,
    default: true,
  },
  rating:{
    type: Number,
    require: true,
  },
});


app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
    rating : req.body.rating
  });
  await product.save();
  res.json({
    success: true,
    name: req.body.name,
  });
});

const Users = mongoose.model('Users',{
  name:{
    type:String,
  },
  email:{
    type:String,
    unique:true,
  },
  password:{
    type:String,
  },
  cartData:{
    type:Object,
  },
  date:{
    type:Date,
    default:Date.now,
  }
})

app.post("/Signup",async(req,res)=>{
  let check = await Users.findOne({email:req.body.email})
  if(check){
    return res.status(400).json({success:false,msg: "user already exist"})
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i]=0;
  }
  const user = new Users({
    name:req.body.username,
    email:req.body.email,
    password:req.body.password,
    cartData:cart,
  })
  await user.save();
  const data = {
    user:{
      id:user.id
    }
  }
  const token = jwt.sign(data,'sercet_ecom');
  res.json({success:true,token})
})

app.post("/login",async (req,res)=>{
  let user = await Users.findOne({email:req.body.email});
  if(user){
    const passCompare = req.body.password === user.password;
    if(passCompare){
      const data = {
        user:{id:user.id
        }
      }
      const token = jwt.sign(data,'secret_ecom');
      res.json({success:true,token});
    }
    else{
      res.json({success:false,error:"wrong Credential"});
    }
  }
  else{
    res.json({success:false,error:"wrong Credential"});
  }
})

app.get("/search/:key",async (req,res)=>{
 let searchByName = req.params.key.trim().toUpperCase()
 let searchByCategory = req.params.key.trim().toLowerCase()
  let data = await Product.find(
      {
          "$or":[
              {name:{$regex:searchByName}},
              {category:{$regex:searchByCategory}},
          ],        
      },
      
  )
  res.send(data);
  console.log(data)
})

// app.get('/fun/:key',async(req,res)=>{
//   let items = req.params.key
//   if(!items) return null
//   let item = Number(items)
//   console.log(item);
//   let products = await Product.find({ new_price: { $gte: 0, $lte: item } });
//   res.send(products)
// })

app.get('/newcollections',async(req,res)=>{
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  res.send(newcollection)
})
app.get('/popularinwomen',async(req,res)=>{
  let products = await Product.find({category:"women"});
  let popular_in_women = products.slice(0,4)
  res.send(popular_in_women)
})

app.post('/popularbyid',async(req,res)=>{
  let productsx = await Product.find({id:req.body.id});
  // let popular_by_id = products.slice(0,1)
  res.send(productsx)
})

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

const fetchuser = async(req,res,next)=>{
  const token = req.header('auth-token');
  if (!token) {
    res.status(401).send({error:"plz authenticate ushing valid detail"})
  }
  else{
    try {
      const data = jwt.verify(token,'secret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({error:"please auth the user"})
    }
  }
}

app.post('/addtocart',fetchuser,async(req,res)=>{
  console.log("Added",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id});
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
  res.send("Added")
})



app.post('/removefromcart',fetchuser,async(req,res)=>{
  console.log("Removed",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id});
  if(userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
  res.send("Removed")
})

app.post('/getcart',fetchuser,async(req,res)=>{
  console.log("GetCart");
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);
})

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All product fetched");
  res.send(products);
});

app.listen(port, (error) => {
  if (!error) {
    console.log("Server running at port " + port);
  } else {
    console.log("Error: " + error);
  }
});
