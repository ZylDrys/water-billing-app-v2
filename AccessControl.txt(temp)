/* SECURITY SYSTEM */

const MASTER_PASSWORD_KEY="masterPassword"
const DEFAULT_MASTER_PASSWORD="admin123"

const TEMP_PASSWORD_KEY="tempPassword"
const TEMP_PASSWORD_EXPIRY_KEY="tempPasswordExpiry"

const THIRTY_DAYS_MS=30*24*60*60*1000

function getMasterPassword(){
return localStorage.getItem(MASTER_PASSWORD_KEY)||DEFAULT_MASTER_PASSWORD
}

/* APP LOGIN */

function checkAppAccess(){

const pwd=prompt("Enter password")

if(!isValidPassword(pwd)){

alert("Access denied")

document.body.innerHTML=
"<h2 style='text-align:center;margin-top:50px'>Access Denied</h2>"

throw new Error("Access denied")

}

}

/* PASSWORD VALIDATION */

function isValidPassword(password){

if(password===getMasterPassword()) return true

const temp=localStorage.getItem(TEMP_PASSWORD_KEY)

const expiry=parseInt(localStorage.getItem(TEMP_PASSWORD_EXPIRY_KEY)||0)

if(temp && password===temp && Date.now()<expiry) return true

return false

}

/* ADMIN ACCESS CHECK */

function isValidAdminAccess(password){

return password===getMasterPassword()

}

/* TEMP PASSWORD */

function createTempPassword(newPassword){

const current=prompt("Enter master password")

if(current!==getMasterPassword()){
alert("Wrong master password")
return
}

localStorage.setItem(TEMP_PASSWORD_KEY,newPassword)

localStorage.setItem(
TEMP_PASSWORD_EXPIRY_KEY,
Date.now()+THIRTY_DAYS_MS
)

alert("Temporary password created")

}
