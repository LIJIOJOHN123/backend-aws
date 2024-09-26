const express = require("express")
const mongoose = require("mongoose")
const jwtToken = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
require('dotenv').config()
var morgan = require('morgan')
const multer  = require('multer')
const {check, validationResult} = require("express-validator")
const cors = require("cors")
const multerS3 = require('multer-s3')


const app = express()

app.use(express.json())
app.use(cors())
app.use(morgan('combined'))



mongoose
  .connect("mongodb://mongodb/tododb")
  .then(() => console.log("Mongodb is connected successfully"))
  .catch((error) => console.log(error));

const Schema = mongoose.Schema



//schema
//useSchema 
//A) user schema
const userSchema = new Schema({
    name:{
        type:String,
        trim:true
    },
    email:{
        type:String,
        trim:true
    },
    password:{
        type:String,
        trim:true
    },
    address:{
        type:String,
        trim:true
    },
    city:{
        type:String,
        trim:true
    },
    state:{
        type:String,
        trim:true
    },
    pin:{
        type:String,
        trim:true
    },
    phone:{
        type:String,
        trim:true
    },
    task:[],
    status:{
        type:String,
        default:"ACTIVE",
        enum:["ACTIVE", "INACTIVE"]
    }
},{
    timestamps:true
})
const User = mongoose.model("users", userSchema)
console.log("dafdaskllk")
//B)Task schema
// title and descriton
const taskSchema = new Schema({
  title:{
    type:String,
    trim:true,
    require:true
  },
  description:{
    type:String,
    trim:true,
    require:true
  },
  user:{
    type:mongoose.Schema.ObjectId,
    ref:"user"
  }
},{
    timestamps:true
})
const Task = mongoose.model("tasks", taskSchema)
app.get("/docker",(req,res)=>{
    res.send("I am working")
})


  
  //
  // If we're not in production then log to the `console` with the format:
  // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  //
  app.post('/upload', upload.array('photos', 3), function(req, res, next) {
    res.send('Successfully uploaded ' + req.files.length + ' files!')
  }) 
app.post('/profile', upload.single('avatar'), function (req, res, next) {
    const file = req.file
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    res.send(file)
  })

const authMiddleware = async(req,res,next)=>{
    if(!req.header("Authorization")){
      return  res.status(401).send({message:"Unauthorized request"})
    }else {
        const token = await req.header("Authorization").replace("Bearer ","")
        const decode = jwtToken.verify(token, "Iamgoodbooksfromsssss")
        const user = await User.findOne({_id:decode._id})
        if(!user){
           return  res.status(404).send({message:"You are not authoized"})
        }
        req.user = user
        next()
    }
   
     
    }
const userRegistraionValidator  = [
    check("name","Name is  required").not().isEmpty(),
    check("email", "Email is required").not().isEmpty(),
    check("password","Password is required").not().isEmpty(),
 
    check("email", "Email is not invalid").isEmail(),
 
    check("password","Password - minmum 7").isLength({
        min:6
    })
]
 
const userLoginValidator = [
    check("email", "Email is required").not().isEmpty(),
    check("password","Password is required").not().isEmpty(),
    check("email", "Email is not invalid").isEmail(),
    check("password","Password - minmum 7").isLength({
        min:6
    })]
//validation
const taskValidation = [
    check("title", "Title is required").not().isEmpty(),
    check("description","Description is required").not().isEmpty()
]
//show error
const validation = (req,res,next)=>{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(404).json({message:errors.array()[0].msg,type:"error"})
      }
      next()
    }
//user apis
//register
app.post("/register", userRegistraionValidator,validation,async(req,res)=>{
    try {
        const newUser = {}
        newUser.name = req.body.name;
        newUser.email = req.body.email;
        newUser.password = await bcrypt.hash(req.body.password, 8)
        newUser.address = req.body.address
        newUser.city = req.body.city
        newUser.pin = req.body.pin;
        newUser.phone = req.body.phone;
        const userDoc = new User(newUser)
        await userDoc.save()
        let token = jwtToken.sign({_id:userDoc.id}, "Iamgoodbooksfromsssss",{expiresIn:'1h'} )
        const {password, ...user} = userDoc.toObject()
        res.send({user:user,token,message:"Registration is done sucessfully"})
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
})
//login
app.post("/login",userLoginValidator, validation, async(req,res)=>{
    try {
      const user = await User.findOne({email:req.body.email})
      if(!user){
        return res.status(400).send({message:"Our sever is down. Please try again"})
      }
      let isMatch  =await bcrypt.compare(req.body.password, user.password)
      if(!isMatch){
       return  res.status(400).send({message:"Password is invalid. Please try again"})
      }
      let token = jwtToken.sign({_id:user._id}, "Iamgoodbooksfromsssss",{expiresIn:"1h"})
      res.status(200).send({user, message:"Login in successfully", token})
    } catch (error) {
        res.status(500).send(error)
 
    }
} )
//current
app.get("/user", authMiddleware, async(req,res)=>{
   try {
    res.send({user:req.user})
   } catch (error) {
    console.log(error)
   }
})
//user edit
app.put("/user",authMiddleware,async(req,res)=>{
    try {
        await User.findByIdAndUpdate({_id:req.user._id},{...req.body})
        const user = await User.findOne({_id:req.user._id})
        res.send({message:"Your details updated successfully",user})
    } catch (error) {
        console.log(error)
    }
})
//create
app.post("/task",taskValidation, authMiddleware,validation, async(req,res)=>{
    try {
        const task = new Task({title:req.body.title, description:req.body.description, user:req.user._id})
        await task.save()
        res.status(200).send({task, message:"task added successfully"})
    } catch (error) {
        res.status(500).send(error)
    }
}) 
//list
app.get("/task", async(req,res)=>{
    try {
       
        const taskCount = await Task.countDocuments()
        const tasks = await Task.find().limit(parseInt(req.query.limit)).sort({createdAt:-1})
        
        res.send({taskCount,tasks})

      
    } catch (error) {
        res.status(500).send(error)
    }
})
//getById
app.get("/task:id" ,async(req,res)=>{
    try {
       const task = await Task.findById({_id:req.params.id}) 
       if(!task){
        res.status(400).send({message:"Task not exist"})
       }
       res.status(200).send(task)
    } catch (error) {
        res.status(500).send(error)
    }
})
//edit
app.put("/task:id", authMiddleware,async(req,res)=>{
    try {
      const task = await Task.findByIdAndUpdate({_id:req.params.id, user:req.user._id},{...req.body},{new:true})
      res.status(200).send({task, message:"Updated successfully"})
    } catch (error) {
        res.status(500).send(error)
    }
})
//delete
app.delete("/task:id", authMiddleware, async(req,res)=>{
    try {
        const task =await Task.findByIdAndDelete({_id:req.params.id,user:req.user._id})
        res.status(200).send({message:"Task delete successfully",task})
    } catch (error) {
        res.status(500).send(error)
    }
})
const PORT = 8000
app.listen(PORT,()=>{
    console.log("Server is connected")
})