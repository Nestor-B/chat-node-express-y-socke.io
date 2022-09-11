const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const session = require('express-session')
const cookieParser = require('cookie-parser')

const oneDay = 1000 * 60 * 60 * 24
app.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: true 
}))
app.use(cookieParser())

app.use(express.json())
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: true}))

const avatars = require('./views/avatar')

app.get('/', (req, res) => {
    var session=req.session;
    if( session.nombre ) {
        res.redirect('/chat')
    }else{
        res.render('login', {avatar: avatars});
    }
})
app.get('/chat', (req, res) => {
    var session=req.session;
    if( session.nombre ) {
        res.render('template', {
            nameUser: session.nombre,
            sessionID: req.sessionID
        });
    }else{
        res.redirect('/');
    }
})
app.post('/verify-credentials', (req, res) => {
    var session=req.session;
    session.nombre=req.body.nombre
    res.redirect('/chat')
})
app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/');
})

server.listen(5000, () => {
    console.log('listening on *:5000');
})

var list = []
io.on('connection', (socket) => {
    socket.on('join', ({sessionID, nameUser, photo, receptor, msg}) => {
        socket.join(sessionID)
        
        if( list.filter(e => e.sessionID == sessionID).length === 0 ){
            list.push({sessionID, nameUser, photo, receptor, msg}) 
        }
        io.emit('list', list)
    })
    socket.on('sendMsg', ({id, receptor, msg}) => {
        var dataUser = list.filter(e => e.sessionID == id)[0]
        dataUser['receptor'] = receptor
        var data = {...dataUser, msg}
        
        socket.to(id).emit('msg', data)
    })
    socket.on('exit', (data) => {
        var list_ = list.filter(e => e != data)
        io.emit('list', list_)
        socket.disconnect()
    })
})
