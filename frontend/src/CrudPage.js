import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function CrudPage() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [viewUser, setViewUser] = useState(null);

  // Fetch users safely
  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8081/users");

      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        console.error("Invalid API response:", res.data);
        setUsers([]);
      }
    } catch (err) {
      console.error("Fetch Users Error:", err);
    }
  };

  

  // Auto refresh users
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 2000);
    return () => clearInterval(interval);
  }, []);

  // Add User
  const handleAdd = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Enter name and email");
      return;
    }

    try {
      await axios.post("http://localhost:8081/users", {
        name,
        email,
      });

      setName("");
      setEmail("");
      fetchUsers();
    } catch (err) {
      console.error("Add User Error:", err);
    }
  };

  // Delete User
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axios.delete(`http://localhost:8081/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>User Table (Auto Refresh)</h2>

      {/* Add user form */}
      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginRight: 10 }}
        />

        <button type="submit" style={{ padding: "5px 15px" }}>
          Add User
        </button>
      </form>

      <h3>All Users</h3>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr style={{ background: "#eee" }}>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>View</th>
            <th>Delete</th>
            <th>Loan</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "gray" }}>
                No Users Found
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name || "—"}</td>
                <td>{u.email || "—"}</td>

                {/* View */}
                <td>
                  <button
                    style={{ background: "blue", color: "#fff" }}
                    onClick={() => setViewUser(u)}
                  >
                    View
                  </button>
                </td>

                {/* Delete */}
                <td>
                  <button
                    style={{ background: "red", color: "#fff" }}
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </button>
                </td>

                {/* Loan */}
                <td>
                  <Link
                    to={`/loan/${u.id}`}
                    style={{
                      background: "orange",
                      color: "#fff",
                      padding: "5px 10px",
                      display: "inline-block",
                    }}
                  >
                    Loan
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* View Modal */}
      {viewUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              minWidth: 300,
            }}
          >
            <h3>User Details</h3>
            <p>
              <strong>ID:</strong> {viewUser.id}
            </p>
            <p>
              <strong>Name:</strong> {viewUser.name}
            </p>
            <p>
              <strong>Email:</strong> {viewUser.email}
            </p>

            <button
              onClick={() => setViewUser(null)}
              style={{ marginTop: 10 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrudPage;
