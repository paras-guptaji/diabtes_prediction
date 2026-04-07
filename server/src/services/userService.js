const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const usersFilePath = path.join(__dirname, "../data/users.json");

async function ensureUsersFileExists() {
  const dataDirectory = path.dirname(usersFilePath);

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2));
  }
}

async function readUsers() {
  await ensureUsersFileExists();
  const fileContent = await fs.promises.readFile(usersFilePath, "utf-8");

  try {
    return JSON.parse(fileContent);
  } catch (_error) {
    return [];
  }
}

async function writeUsers(users) {
  await ensureUsersFileExists();
  await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
}

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase()
  );
}

async function createUser({
  name,
  email,
  password,
  authProvider = "local",
  googleId = "",
}) {
  const users = await readUsers();

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password: password ? await bcrypt.hash(password, 10) : "",
    authProvider,
    googleId,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  return newUser;
}

async function validatePassword(user, password) {
  if (!user?.password) {
    return false;
  }

  return bcrypt.compare(password, user.password);
}

async function findOrCreateGoogleUser({ name, email, googleId }) {
  const users = await readUsers();
  const existingUser = users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase()
  );

  if (existingUser) {
    // Upgrade the stored auth provider if the same person signs in with Google later.
    existingUser.authProvider = "google";
    existingUser.googleId = googleId;
    existingUser.name = existingUser.name || name;
    await writeUsers(users);
    return existingUser;
  }

  const newGoogleUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password: "",
    authProvider: "google",
    googleId,
    createdAt: new Date().toISOString(),
  };

  users.push(newGoogleUser);
  await writeUsers(users);
  return newGoogleUser;
}

module.exports = {
  createUser,
  ensureUsersFileExists,
  findOrCreateGoogleUser,
  findUserByEmail,
  readUsers,
  validatePassword,
};
