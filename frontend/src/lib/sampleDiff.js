/** Built-in realistic sample PR for demos: SQL injection, hardcoded secret, missing null check. */
export const SAMPLE_PR_TITLE = "Add user lookup endpoint and payment webhook";

export const SAMPLE_PR_DIFF = `diff --git a/app/users.py b/app/users.py
index 3b1f2a7..9c4d8e1 100644
--- a/app/users.py
+++ b/app/users.py
@@ -1,7 +1,21 @@
 import sqlite3
+import requests

 DB_PATH = "app.db"
+PAYMENT_API_KEY = "sk_live_51Hq8a2eZvKYlo2C0xAmpl3SecretKey"


 def get_connection():
     return sqlite3.connect(DB_PATH)
+
+
+def find_user(name):
+    conn = get_connection()
+    query = "SELECT id, email, role FROM users WHERE name = '" + name + "'"
+    row = conn.execute(query).fetchone()
+    return {"id": row[0], "email": row[1], "role": row[2]}
+
+
+def charge_customer(user_id, amount):
+    headers = {"Authorization": "Bearer " + PAYMENT_API_KEY}
+    return requests.post("https://pay.example.com/charge", json={"user": user_id, "amount": amount}, headers=headers)
diff --git a/app/profile.js b/app/profile.js
index 5a7c0de..e12b9f4 100644
--- a/app/profile.js
+++ b/app/profile.js
@@ -1,3 +1,11 @@
 export function renderProfile(user) {
-  return \`<h1>\${escapeHtml(user.name)}</h1>\`;
+  const el = document.getElementById("profile");
+  el.innerHTML = "<h1>" + user.name + "</h1>";
+  return el;
 }
+
+export async function loadProfile(id) {
+  const res = await fetch("/api/users/" + id);
+  const data = await res.json();
+  return data.profile.avatar.url;
+}
`;
