/**
 * CodeSense AI - "while you wait" mini lessons shown by the loader.
 * Each lesson: what the bug is, how it happens, a risky snippet and a safer one. English + Hinglish.
 * Static content (no AI call), so it is instant and always accurate. by Nitish Singh
 */
export const LESSONS = [
  {
    id: "sqli", tag: "security", lang: "python", title: "SQL injection",
    en: { what: "An attacker types SQL instead of a normal value, and your database runs it.", how: "It happens when you build a query by joining strings with user input." },
    hi: { what: "Attacker normal value ki jagah SQL likh deta hai, aur tumhara database use chala deta hai.", how: "Ye tab hota hai jab tum user ke input ko jodkar query banate ho." },
    bad: 'q = "SELECT * FROM users WHERE name = \'" + name + "\'"',
    good: 'cur.execute("SELECT * FROM users WHERE name = ?", (name,))',
  },
  {
    id: "secret", tag: "security", lang: "python", title: "Hardcoded secrets",
    en: { what: "A password or API key written inside the code can be read by anyone who sees the code.", how: "It usually leaks when the project is pushed to GitHub." },
    hi: { what: "Code ke andar likha password ya API key wo har koi padh sakta hai jise code dikhe.", how: "Aksar GitHub par push karte hi ye leak ho jaata hai." },
    bad: 'API_KEY = "sk-live-51Hq8a2eZvKY..."',
    good: 'API_KEY = os.environ["API_KEY"]',
  },
  {
    id: "xss", tag: "security", lang: "javascript", title: "Cross-site scripting (XSS)",
    en: { what: "A visitor's text is run as code in other people's browsers.", how: "It happens when untrusted text is put into the page as HTML." },
    hi: { what: "Kisi visitor ka likha text doosron ke browser mein code ki tarah chal jaata hai.", how: "Ye tab hota hai jab bharosa na karne laayak text ko seedha HTML bana ke page mein daal dete ho." },
    bad: "el.innerHTML = user.name;",
    good: "el.textContent = user.name;",
  },
  {
    id: "zero", tag: "bug", lang: "python", title: "Division by zero",
    en: { what: "The program crashes because it divides by 0.", how: "It happens when the divisor comes from data that can be empty, like len([])." },
    hi: { what: "Program crash ho jaata hai kyunki wo 0 se divide kar raha hai.", how: "Ye tab hota hai jab bhaajak aisi cheez se aata hai jo khaali ho sakti hai, jaise len([])." },
    bad: "avg = total / len(items)",
    good: "avg = total / len(items) if items else 0",
  },
  {
    id: "none", tag: "bug", lang: "python", title: "None / null errors",
    en: { what: "The program crashes when it uses a value that is empty (None or null).", how: "It happens when a lookup finds nothing but the code assumes it found something." },
    hi: { what: "Program crash hota hai jab wo khaali (None ya null) value use karta hai.", how: "Ye tab hota hai jab search mein kuch nahi milta par code maan leta hai ki mil gaya." },
    bad: "name = find_user(id).name.upper()",
    good: "user = find_user(id)\nname = user.name.upper() if user else \"\"",
  },
  {
    id: "offby1", tag: "bug", lang: "python", title: "Off-by-one error",
    en: { what: "A loop runs one time too many or one time too few.", how: "Lists start at 0, so a list of 5 items ends at index 4." },
    hi: { what: "Loop ek baar zyada ya ek baar kam chalta hai.", how: "List 0 se shuru hoti hai, to 5 items ki list index 4 par khatam hoti hai." },
    bad: "for i in range(len(a) + 1):\n    print(a[i])",
    good: "for x in a:\n    print(x)",
  },
  {
    id: "mutable", tag: "bug", lang: "python", title: "Mutable default argument",
    en: { what: "One list is shared by every call, so old data keeps showing up.", how: "Python creates the default list once, not on every call." },
    hi: { what: "Ek hi list har call mein share hoti hai, isliye purana data baar-baar dikhta hai.", how: "Python default list ek hi baar banata hai, har call par nahi." },
    bad: "def add(x, items=[]):\n    items.append(x)",
    good: "def add(x, items=None):\n    items = items or []\n    items.append(x)",
  },
  {
    id: "except", tag: "bug", lang: "python", title: "Silent errors",
    en: { what: "Something breaks, but you never find out, because the error is hidden.", how: "An empty except block catches every error and throws it away." },
    hi: { what: "Kuch toot jaata hai par pata hi nahi chalta, kyunki error chhupa diya gaya hai.", how: "Khaali except block har error pakad ke phenk deta hai." },
    bad: "try:\n    save(data)\nexcept:\n    pass",
    good: "try:\n    save(data)\nexcept OSError as e:\n    log.warning(\"save failed: %s\", e)",
  },
  {
    id: "eval", tag: "security", lang: "python", title: "Dangerous eval()",
    en: { what: "eval() runs any text as code, so an attacker can run their own commands.", how: "It happens when text from a user or a file goes into eval()." },
    hi: { what: "eval() koi bhi text code ki tarah chala deta hai, to attacker apne commands chala sakta hai.", how: "Ye tab hota hai jab user ya file ka text eval() mein jaata hai." },
    bad: "result = eval(user_text)",
    good: "result = ast.literal_eval(user_text)",
  },
  {
    id: "leak", tag: "bug", lang: "python", title: "Forgotten close()",
    en: { what: "Files and connections stay open and the program slowly runs out of them.", how: "It happens when an error occurs before close() is reached." },
    hi: { what: "Files aur connections khule reh jaate hain aur program dheere-dheere unse khatam ho jaata hai.", how: "Ye tab hota hai jab close() tak pahunchne se pehle error aa jaata hai." },
    bad: "f = open(path)\ndata = f.read()",
    good: "with open(path) as f:\n    data = f.read()",
  },
  {
    id: "md5", tag: "security", lang: "python", title: "Weak password hashing",
    en: { what: "Passwords hashed with MD5 can be cracked in seconds.", how: "MD5 is fast and unsalted, which is exactly what attackers want." },
    hi: { what: "MD5 se bane password hash kuch hi second mein crack ho jaate hain.", how: "MD5 tez hai aur salt nahi hota, aur attackers ko yahi chahiye." },
    bad: "h = hashlib.md5(pw.encode()).hexdigest()",
    good: "h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())",
  },
];

export const TAG_LABEL = { security: "Security", bug: "Bug", habit: "Habit" };
