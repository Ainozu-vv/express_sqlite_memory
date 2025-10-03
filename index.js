const express = require("express");
const sqlite3 = require("sqlite3");

const app = express();
const db = new sqlite3.Database(":memory:"); //file útvonal ,ha fileba mentünk

const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS data(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jsonData TEXT
        )
        `);
});

//ÚTVONALAK
app.post("/login",login)
app.post("/contact",contact)
app.put("/users/:id",updateUser)    //users/12
app.delete("/users/:id",deleteUser) //users/12
app.post("/add",addData)
app.get("/read",readData)

//függvények
function login(req,res){
    const {username,password}=req.body //query-->az URL-ben látható, a body nem
    console.log(username)

    if(username&&password){
        res.json({message:`Hello, ${username}`})
    }
    else
    {
        res.json({message:`Kötelező megadni a nevet és a jelszót!`})
    }
}
function contact(req,res){
    const {name,email,message}=req.body

    if(name&&email&&message){
        res.json({status:"Message recieved",data:req.body})
    }
    else{
        res.status(400).json({error:"All field are required"})
    }
}
function updateUser(req,res){}
function deleteUser(req,res){}
function addData(req,res){}
function readData(req,res){}

app.listen(port,()=>{
    console.log(`A szerver elindult a porton: ${port}`)
})


