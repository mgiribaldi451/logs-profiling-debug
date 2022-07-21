const express = require('express');
const session = require('express-session');
const handlebars = require('express-handlebars');
const routes = require('./src/routes/routes')
const UserModel = require('./src/models/usuarios');
const compression = require('compression')
const { validatePass } = require('./src/utils/passValidator');
const { createHash } = require('./src/utils/hashGenerator')

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { TIEMPO_EXPIRACION } = require('./src/config/config')
const cluster = require('cluster')
const numCPUs = require('os').cpus().length;
const yargs = require('yargs/yargs')(process.argv.slice(2));
const params = yargs.argv
//console.log(port);
//const yargs = require('yargs/yargs')([ '-p', '8080' ]).argv
// const TIEMPO_EXPIRACION = 600000
const app = express()

app.use(session({
    secret: 'coderhouse',
    cookie: {
        httpOnly: false,
        secure: false,
        maxAge: parseInt(TIEMPO_EXPIRACION)
    },
    rolling: true,
    resave: true,
    saveUninitialized: true
}))


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize())
app.use(passport.session())

app.engine(
    "hbs",
    handlebars.engine({
        extname: ".hbs",
        defaultLayout: 'index.hbs',
        layoutsDir: __dirname + "/src/views/layouts",
        partialsDir: __dirname + "/src/views/partials/",
        runtimeOptions: {
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true,
        }
    })
);
app.set('view engine', 'hbs');
app.set('views', './src/views');
app.use(express.static(__dirname + "/public"));

passport.use('login', new LocalStrategy(
    (username, password, callback) => {
        UserModel.findOne({ username: username }, (err, user) => {
            if (err) {
                return callback(err)
            }

            if (!user) {
                console.log('No se encontro usuario');
                return callback(null, false)
            }

            if (!validatePass(user, password)) {
                console.log('Invalid Password');
                return callback(null, false)
            }

            return callback(null, user)
        })
    }
))


passport.use('signup', new LocalStrategy(
    { passReqToCallback: true }, (req, username, password, callback) => {
        UserModel.findOne({ username: username }, (err, user) => {
            if (err) {
                console.log('Hay un error al registrarse');
                return callback(err)
            }

            if (user) {
                console.log('El usuario ya existe');
                return callback(null, false)
            }

            console.log(req.body);

            const newUser = {
                firstName: req.body.firstname,
                lastName: req.body.lastname,
                email: req.body.email,
                username: username,
                password: createHash(password)
            }

            console.log(newUser);


            UserModel.create(newUser, (err, userWithId) => {
                if (err) {
                    console.log('Hay un error al registrarse');
                    return callback(err)
                }

                console.log(userWithId);
                console.log('Registro de usuario satisfactoria');

                return callback(null, userWithId)
            })
        })
    }
))


passport.serializeUser((user, callback) => {
    callback(null, user._id)
})

passport.deserializeUser((id, callback) => {
    UserModel.findById(id, callback)
})

app.get('/api/random/:num', routes.getRandoms)

//  INDEX
app.get('/', routes.getRoot);

// INFO

app.get('/info',compression(), routes.getInfo);



//  LOGIN
app.get('/login', routes.getLogin);
app.post('/login', passport.authenticate('login', { failureRedirect: '/faillogin' }), routes.postLogin);
app.get('/faillogin', routes.getFaillogin);

//  SIGNUP
app.get('/signup', routes.getSignup);
app.post('/signup', passport.authenticate('signup', { failureRedirect: '/failsignup' }), routes.postSignup);
app.get('/failsignup', routes.getFailsignup);

//  LOGOUT
app.get('/logout', routes.getLogout);



// PROFILE
app.get('/profile', routes.getProfile);

app.get('/ruta-protegida', routes.checkAuthentication, (req, res) => {
    res.render('protected')
});

//  FAIL ROUTE
app.get('*', routes.failRoute);






if (params.m === 'FORK' || params.m === 'fork') {
    const server = app.listen(params.p, () => {
        console.log(`Server on port ${params.p}`);

        server.on('error', error => console.log(`Error en el servidor ${error}`))
    })
} else if (params.m === 'CLUSTER' || params.m === 'cluster') {
    if (cluster.isMaster) {
        console.log(numCPUs);
        console.log(`PID MASTER: ${process.pid}`);

        for (let i = 0; i < numCPUs; i++) {
            cluster.fork()

        }

        cluster.on('Worker', worker => {
            console.log(worker.process.pid, 'died', new Date().toLocaleString());
            cluster.fork()
        })

    } else {
        const server = app.listen(params.p, () => {
            console.log(`SERVER ON corriento en el puerto: ${params.p} - en MODO: CLUSTER- <b>PID WORKER: ${process.pid}</b>`);
        });

        server.on('error', error => { console.log(error) })
    }
}
