
const express = require("express");
const { Sequelize, DataTypes, Op } = require("sequelize");

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });

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
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    return res.json({ message: `Hello, ${username}` });
  }
  return res.status(400).json({ message: "Kötelező megadni a nevet és a jelszót!" });
});

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (name && email && message) {
    return res.json({ status: "Message recieved", data: req.body });
  }
  return res.status(400).json({ error: "All field are required" });
});

app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name,email és password kötelező mező" });
    }
    const user = await User.create({ name, email, password });
    const fresh = await User.findByPk(user.id, { attributes: ["id", "name", "email", "created_at"] });
    return res.status(201).json(fresh);
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Email már létezik" });
    }
    console.error(err);
    return res.status(500).json({ error: "Nem sikerült felvenni a felhasználót" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ["id", "name", "created_at"], order: [["id", "ASC"]] });
    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Nem sikerült csatlakozni" });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: ["id", "name", "created_at"] });
    if (!user) return res.status(404).json({ error: "Felhasználó nem található" });
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Nem sikerült csatlakozni" });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: "Kötelező a name és/vagy email mező" });
    }

    const existing = await User.findByPk(userId);
    if (!existing) return res.status(404).json({ error: "User nem található" });

    if (email && email !== existing.email) {
      const clash = await User.findOne({ where: { email, id: { [Op.ne]: userId } } });
      if (clash) return res.status(409).json({ error: "Email már létezik" });
    }

    existing.name = name ?? existing.name;
    existing.email = email ?? existing.email;
    await existing.save();

    const fresh = await User.findByPk(userId, { attributes: ["id", "name", "email", "created_at"] });
    return res.json(fresh);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Hiba szerver oldalon" });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const deleted = await User.destroy({ where: { id: userId } });
    if (deleted === 0) return res.status(404).json({ error: "User nem található" });
    return res.json({ message: `User deleted with id:${userId}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Hiba szerver oldalon" });
  }
});

app.post("/add", async (req, res) => {
  try {
    const jsonData = JSON.stringify(req.body);
    const row = await Data.create({ jsonData });
    return res.json({ message: "Data saved ", id: row.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save data" });
  }
});

app.get("/read", async (req, res) => {
  try {
    const rows = await Data.findAll({ order: [["id", "ASC"]] });
    return res.json({ data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed to fetch data" });
  }
});

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(port, () => {
      console.log(`A szerver elindult a porton: ${port}`);
    });
  } catch (err) {
    console.error("Nem sikerült elindítani az alkalmazást:", err);
    process.exit(1);
  }
})();
