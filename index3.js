const express = require("express");
const sqlite3 = require("sqlite3");
const { Sequelize, DataTypes, Op } = require("sequelize");

const app = express();

const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: ":memory:",
  logging: false,
});

const Data = sequelize.define(
  "Data",
  {
    jsonData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "data",
    timestamps: false,
  }
);

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "users",
    underscored: true, //created_at  updated_at  createdAt updatedAt
    timestamps: true,
    updatedAt: false,
  }
);
//ÚTVONALAK
app.post("/login", login);
app.post("/contact", contact);

//USER CRUD
//Create, Read,Update,Delete
app.post("/users", createUser); //Create
app.get("/users", listUsers); //Read
app.get("/users/:id", getUser); //Read /user/1

app.put("/users/:id", updateUser); //Update /users/12
app.delete("/users/:id", deleteUser); //Delete /users/12

app.post("/add", addData);
app.get("/read", readData);

//függvények
function login(req, res) {
  const { username, password } = req.body; //query-->az URL-ben látható, a body nem
  console.log(username);

  if (username && password) {
    res.json({ message: `Hello, ${username}` });
  } else {
    res.json({ message: `Kötelező megadni a nevet és a jelszót!` });
  }
}
function contact(req, res) {
  const { name, email, message } = req.body;

  if (name && email && message) {
    res.json({ status: "Message recieved", data: req.body });
  } else {
    res.status(400).json({ error: "All field are required" });
  }
}
async function updateUser(req, res) {
  // /users/2 ->body új adatok
  const userId = req.params.id;
  const { name, email } = req.body;
  //elsőnek megkell nézni létezik-e az adott ID-n user
  if (!name && !email) {
    return res.status(400).json({ error: "Kötelező a name és email mező" });
  }
  User.findByPk(userId).then((existing) => {
    if (!existing) return res.status(404).json({ error: "User nem található" });
  });

  const checkEmail =
    email && email !== existing.email
      ? User.findOne({ where: { email, id: { [Op.ne]: userId } } }).then(
          (clash) => {
            if (clash) {
              return res.status(409).json({ error: "Email már létezik" });
            }
          }
        )
      : Promise.resolve(null);

  return checkEmail
    .then((result) => {
      if (result && result.error) return result;

      existing.name = name ?? existing.name;
      existing.email = name ?? existing.email;
      return existing
        .save()
        .then(() => {
          User.findByPk(userId, {
            attributes: ["id", "name", "email", "created_at"],
          });
        })
        .then((fresh) => res.json(fresh));
    })
    .catch((err) => {
      return res.status(500).json({ error: "Hiba a szerver oldalon" });
    });
}
async function deleteUser(req, res) {
  const userId = req.params.id;
  User.destroy({ where: { id: userId } })
    .then((deleted) => {
      if (deleted == 0)
        return res.status(404).json({ error: "User nem található" });
      return res.json({ message: "User sikeresen törölve" });
    })
    .catch((err) => {
      return res.status(500).json({ error: "Hiba a szerver oldalon" });
    });
}
function addData(req, res) {
  const jsonData = JSON.stringify(req.body);
  db.run(`INSERT INTO data (jsonData) VALUES (?)`, [jsonData], function (err) {
    if (err) {
      return res.status(500).json({ error: "Failed to save data" });
    }
    res.json({ message: "Data saved ", id: this.lastID });
  });
}
function readData(req, res) {
  db.all(`SELECT * FROM data`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "failed to fetch data",
      });
    }
    res.json({ data: rows });
  });
}

async function createUser(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name,email és password kötelező mező" });
  }
  User.create({ name, email, password })
    .then((user) =>
      User.findByPk(user.id, {
        attributes: ["id", "name", "email"],
      })
    )
    .then((fresh) => res.status(201).json(fresh))
    .catch((err) => {
      if (err?.name == "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "Email már létezik!" });
      }
      return res
        .status(500)
        .json({ error: "Nem sikerült felvenni a felhasználót." });
    });
}
async function listUsers(req, res) {
  User.findAll({
    attributes: ["id", "name", "created_at"],
    order: [["id", "ASC"]],
  })
    .then((users) => res.json(users))
    .catch((err) => {
      res.status(500).json({ error: "Nem sikerült a lekérdezés" });
    });
}
async function getUser(req, res) {
  User.findByPk(req.params.id, {
    attributes: ["id", "name", "created_at"],
    order: [["id", "ASC"]],
  })
    .then((existing) => {
      if (!existing) {
        return res.status(404).json({ error: "Felhasználó nem létezik" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: "Nem sikerült a lekérdezés" });
    });
}

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(port, () => {
      console.log("A szerver elindult");
    });
  } catch (error) {
    console.error("Nem sikerült elindítani a szervert:", error);
    process.exit(1);
  }
})();
