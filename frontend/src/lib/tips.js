/**
 * CodeSense AI - curated beginner tips (static, no AI call).
 * Each tip has simple English (en) and Hinglish (hi). Deterministic by date.
 * by Nitish Kumar Singh
 */
export const TIPS = [
  { tag: "security", en: "Never put passwords or API keys directly in your code. Keep them in environment variables or a .env file that you do not upload to GitHub.", hi: "Password ya API key kabhi code ke andar mat likho. Unhe environment variable ya .env file mein rakho, aur .env ko GitHub par upload mat karo." },
  { tag: "security", en: "Never build an SQL query by joining strings with user input. Use parameters (the ? placeholders) so attackers cannot inject their own SQL.", hi: "User ke input ko jodkar SQL query mat banao. Parameters (? wale placeholders) use karo, taaki koi attacker apna SQL ghusa na sake." },
  { tag: "security", en: "Treat everything a user types as untrusted. Check its type, length and format before you use it.", hi: "User jo bhi type kare use bharosemand mat samjho. Use karne se pehle uska type, length aur format check karo." },
  { tag: "security", en: "Never store passwords as plain text. Store a salted hash made with bcrypt or argon2.", hi: "Password ko seedha text mein save mat karo. bcrypt ya argon2 se bana salted hash save karo." },
  { tag: "security", en: "Do not use eval() on text that comes from outside. It can run any code an attacker sends.", hi: "Bahar se aaye text par eval() mat chalao. Attacker koi bhi code bhej kar chalwa sakta hai." },
  { tag: "security", en: "Keep your libraries updated. Old versions often have known security holes that are already public.", hi: "Apni libraries update rakho. Purane versions mein aksar aise security holes hote hain jo sabko pehle se pata hain." },
  { tag: "security", en: "Show friendly error messages to users and keep the technical details in your logs. Stack traces help attackers.", hi: "User ko saaf-suthra error message dikhao aur technical details apne logs mein rakho. Stack trace attacker ki madad karta hai." },
  { tag: "security", en: "Use HTTPS everywhere. Plain HTTP lets anyone on the same Wi-Fi read the data.", hi: "Har jagah HTTPS use karo. Simple HTTP mein same Wi-Fi par koi bhi data padh sakta hai." },
  { tag: "bugs", en: "Before dividing, check that the divisor is not zero. Dividing by zero crashes many programs.", hi: "Divide karne se pehle check karo ki bhaajak zero to nahi hai. Zero se divide karne par kai programs crash ho jaate hain." },
  { tag: "bugs", en: "Always close files and database connections when you are done. In Python, the with statement does this for you.", hi: "Kaam khatam hone par file aur database connection band karo. Python mein with statement yeh khud kar deta hai." },
  { tag: "bugs", en: "Lists start at index 0, so the last item of a list with 5 items is at index 4. Off-by-one mistakes are the most common bug.", hi: "List index 0 se shuru hoti hai, to 5 items ki list ka last item index 4 par hota hai. Off-by-one galti sabse common bug hai." },
  { tag: "bugs", en: "Check for None or null before you use a value. Calling a method on nothing crashes the program.", hi: "Value use karne se pehle check karo ki wo None ya null to nahi hai. Khaali cheez par method chalane se program crash hota hai." },
  { tag: "bugs", en: "Do not catch every error silently with an empty except block. You will never find out what went wrong.", hi: "Khaali except block se har error chupchap mat pakdo. Phir pata hi nahi chalega ki galat kya hua." },
  { tag: "bugs", en: "Use == to compare values and = to assign them. Mixing them up is a classic beginner bug.", hi: "Values compare karne ke liye == aur assign karne ke liye = use karo. Dono ko mix karna beginners ki classic galti hai." },
  { tag: "bugs", en: "Watch out for a loop that never ends. Make sure something inside the loop changes the condition.", hi: "Aise loop se bacho jo kabhi khatam nahi hota. Dhyan rakho ki loop ke andar kuch condition ko badal raha ho." },
  { tag: "bugs", en: "Do not use a mutable default argument like def f(items=[]). The same list is shared between all calls.", hi: "def f(items=[]) jaisa mutable default argument mat use karo. Wahi ek list sabhi calls mein share hoti hai." },
  { tag: "habits", en: "Give variables clear names. total_price is better than tp, because you read code more often than you write it.", hi: "Variables ke naam saaf rakho. tp ki jagah total_price likho, kyunki code ko likhne se zyada padhna padta hai." },
  { tag: "habits", en: "Keep each function small and focused on one job. If you need the word and to describe it, split it.", hi: "Har function chhota rakho aur sirf ek kaam karwao. Agar describe karne ke liye aur lagana pade, to use todo." },
  { tag: "habits", en: "Write a short comment about why you did something, not what the code does. The code already shows the what.", hi: "Comment mein yeh likho ki tumne kuch kyun kiya, yeh nahi ki code kya karta hai. Kya karta hai, wo code khud dikhata hai." },
  { tag: "habits", en: "Commit your work to Git often, with a clear message. Small commits are easy to undo.", hi: "Apna kaam Git mein baar-baar commit karo, saaf message ke saath. Chhote commits ko undo karna aasaan hota hai." },
  { tag: "habits", en: "Test with weird inputs: an empty list, zero, a negative number, a very long text. Bugs hide at the edges.", hi: "Ajeeb inputs se test karo: khaali list, zero, negative number, bahut lamba text. Bugs kinaron par chhupte hain." },
  { tag: "habits", en: "Read the error message from the bottom up. The last line says what went wrong and the lines above say where.", hi: "Error message ko neeche se upar padho. Aakhri line batati hai kya galat hua, aur upar ki lines batati hain kahan." },
  { tag: "habits", en: "Do not copy code you do not understand. Run it in small pieces and print the values to see what happens.", hi: "Jo code samajh nahi aaya use copy mat karo. Chhote tukdon mein chalao aur values print karke dekho kya ho raha hai." },
  { tag: "habits", en: "Avoid magic numbers. Write MAX_RETRIES = 3 once and use the name everywhere.", hi: "Magic numbers se bacho. MAX_RETRIES = 3 ek baar likho aur har jagah wahi naam use karo." },
  { tag: "habits", en: "Format your code the same way everywhere. A formatter like Black or Prettier does this automatically.", hi: "Poore code ko ek hi tarah format karo. Black ya Prettier jaisa formatter yeh apne aap kar deta hai." },
  { tag: "performance", en: "Do not run a database query inside a loop if one query can fetch everything at once.", hi: "Agar ek query se sab mil sakta hai to loop ke andar baar-baar database query mat chalao." },
  { tag: "performance", en: "Looking up a key in a dictionary or set is very fast. Searching a long list again and again is slow.", hi: "Dictionary ya set mein key dhundhna bahut tez hota hai. Lambi list mein baar-baar search karna slow hota hai." },
  { tag: "performance", en: "Build big strings with join() instead of adding them with + inside a loop.", hi: "Bade strings loop mein + se jodne ki jagah join() se banao." },
  { tag: "performance", en: "Measure first, then optimise. Most slowness comes from one small part of the program.", hi: "Pehle naapo, phir optimise karo. Zyadatar slowness program ke kisi ek chhote hisse se aati hai." },
  { tag: "web", en: "Never trust the browser alone for checks. Validate the data again on the server.", hi: "Sirf browser ke bharose check mat karo. Data ko server par bhi dobara validate karo." },
  { tag: "web", en: "A good API returns a clear status code: 200 for OK, 400 for a bad request, 404 for not found, 500 for a server error.", hi: "Achhi API saaf status code deti hai: 200 matlab OK, 400 galat request, 404 nahi mila, 500 server error." },
  { tag: "learning", en: "Rubber duck debugging works. Explain your code line by line to a toy, and you often spot the bug yourself.", hi: "Rubber duck debugging kaam karta hai. Apna code ek khilone ko line-by-line samjhao, aksar bug khud mil jaata hai." },
  { tag: "learning", en: "Code a little every day. Thirty minutes daily beats five hours once a week.", hi: "Roz thoda code likho. Roz tees minute, hafte mein ek baar paanch ghante se behtar hai." },
  { tag: "learning", en: "Reading code written by others is a superpower. Open a small open-source project and try to follow one feature.", hi: "Dusron ka likha code padhna ek superpower hai. Koi chhota open-source project kholo aur ek feature ko follow karo." },
  { tag: "learning", en: "Stuck for more than 20 minutes? Write down your question clearly and ask. Writing it often reveals the answer.", hi: "Bees minute se zyada atke ho? Apna sawaal saaf likho aur pucho. Likhte-likhte aksar jawab mil jaata hai." },
];

/** Deterministic tip for a date: same tip all day, a new one tomorrow. */
export function tipForDate(d = new Date()) {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return { tip: TIPS[day % TIPS.length], index: day % TIPS.length };
}
