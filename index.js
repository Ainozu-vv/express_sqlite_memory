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

  db.run(`
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    `);
});

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
function updateUser(req, res) {
  // /users/2 ->body új adatok
  const userId = req.params.id;
  const { name, email } = req.body;
  //elsőnek megkell nézni létezik-e az adott ID-n user
  if (!name && !email) {
    return res.status(400).json({ error: "Kötelező a name és email mező" });
  }

  //1. lépés: meglévő adat lekérése
  db.get(`SELECT * FROM users WHERE id=?`[userId], (err, existing) => {
    if (err) {
      console.err(err);
      return res.status(500).json({ error: "Hiba a lekérdezés során" });
    }
    if (!existing) {
      return res.status(404).json({ error: "User nem található" });
    }
    const newName = name ?? existing.name;
    const newEmail = email ?? existing.email;

    db.run(
      `UPDATE user SET name=?,email=? WHERE id=?`,
      [newName, newEmail, userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Hiba szerver oldalon" });
        }
        db.get(
          `SELECT id,name,email,created_at FROM users WHERE id=?`,
          [userId],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: "Hiba szerver oldalon" });
            }
            row.json(row);
          }
        );
      }
    );
  });
}
function deleteUser(req, res) {
  const userId = req.params.id;
  db.run(`DELETE FROM uses WHERE id=?`, [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: "Hiba szerver oldalon" });
    }
    if (this.changes == 0) { //volt-e sor változás az adatbázisban??
      return res.status(404).json({ error: "User nem található" });
    }
    res.json({ message: `User deleted with id:${userId}` });
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

function createUser(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name,email és password kötelező mező" });
  }

  db.run(
    `INSERT INTO users (name,email,password) VALUES (?,?,?)`,
    [name, email, password],
    function (err) {
      if (err) {
        if (err.message && err.message.includes("UNIQUE")) {
          return res.status(409).json({ error: "Email már létezik" });
        }
        console.error(err);
        return res
          .status(500)
          .json({ error: "Nem sikerült felvenni a felhasználót" });
      }
      db.get(
        `SELECT id,name,email,created_at FROM users WHERE id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) {
            console.error(err);
            return res.status(201).json({ id: this.lastID }); //fallback hogy tényleg létrejött-e
          }
          res.status(201).json(row);
        }
      );
    }
  );
}
function listUsers(req, res) {
  db.all(
    `SELECT id,name,created_at FROM users ORDER BY id ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Nem sikerült csatlakozni" });
      }
      res.json({ users: rows });
    }
  );
}
function getUser(req, res) {
  const userId = req.params.id;
  console.log(userId);
  db.get(
    `SELECT id,name,created_at FROM users WHERE id=?`,
    [userId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Nem sikerült csatlakozni" });
      }
      if (!row) {
        return res.status(404).json({ error: "Felhasználó nem található" });
      }
      res.json({ user: row });
    }
  );
}

app.listen(port, () => {
  console.log(`A szerver elindult a porton: ${port}`);
});
