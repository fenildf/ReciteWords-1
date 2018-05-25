const express = require('express');
const passport = require('passport');
const passportConfig = require('./../config/passport');
const Account = require('../models/account');
const mongoose = require('mongoose');
const router = express.Router();
const config  = require('./../config/config');
const crypto = require('crypto');

router.get('/info', (req, res) => {
    let user = Account.findOne({ username: req.query.user }, (err, user) => {
        if(err || !user) res.send('不存在的用户，或系统错误。');
        else {
            res.render('user/info', {
                user: req.user,
                passed: user.passed,
                error: req.flash('error'),
                success: req.flash('success')
            });
        }
    })
});

router.get('/login', (req, res) => {
    if(req.isAuthenticated()) {
        res.redirect('/');
        return;
    }
    res.render('user/login', {
        error: req.flash('error'),
        success: req.flash('success'),
        user: null
    });
});

router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/user/login',
        successRedirect:'/',
        failureFlash: true
    }),
);

router.get('/registe', (req, res) => {
    if(req.isAuthenticated()) {
        res.redirect('/');
        return;
    }
    let message = req.flash('error');
    res.render('user/registe', {
        user: null,
        message: message,
        hasError: message.length > 0
    });
});

function encrypt(password) {
    for(let i=1; i<=500; i++) {
        let md5 = crypto.createHash('md5');
        md5.update(password + config.PASSWORD_SALT);
        password = md5.digest('hex');
    }
    return password;
}

router.post('/registe', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    if(username.length < 4 || username.length > 12) {
        req.flash('error', "用户名过长或过短。");
        res.redirect('/user/registe');
        return;
    }
    let re = new RegExp(/^\w+$/i);
    if(!re.test(username)) {
        console.log(re.test(username));
        req.flash('error', "用户名只能由英文字母数字和下划线组成。");
        res.redirect('/user/registe');
        return;
    }
    if(password.length < 4) {
        req.flash('error', "密码过短(大于4字符)。");
        res.redirect('/user/registe');
        return;
    }
    Account.findOne({ username: username }, (err, user) => {
        if(user) {
            req.flash('error', "用户已经存在。");
            res.redirect('/user/registe');
        } else {
            let account = new Account({
                username: username,
                password: encrypt(password)
            })
            account.save().then(() => {
                req.flash('success', '注册成功，请开始登录吧！');
                res.redirect('/user/login');
            });
        }
    });
});

router.post('/changepassword', (req, res) => {
    if(!req.user) {
        res.redirect('/');
        return;
    }
    if(req.body.new1 != req.body.new2) {
        req.flash('error', '两次的新密码输入不一致。');
        res.redirect('/user/info?user=' + req.user.username);
        console.log('/user/info?user=' + req.user.username);
        return;
    }
    let oldPass = req.body.old;
    let newPass = req.body.new1;
    if(newPass.length < 4) {
        req.flash('error', "密码过短(大于4字符)。");
        res.redirect('/user/info?user=' + req.user.username);
        return;
    }
    Account.findOne({username: req.user.username}, (err, query) => {
        if(encrypt(oldPass) != query.password) {
            req.flash('error', '原密码输入错误。');
            res.redirect('/user/info?user=' + req.user.username);
            return;
        }
        query.password = encrypt(newPass);
        query.save();
        req.flash('success', '改密码成功。');
        res.redirect('/user/info?user=' + req.user.username);
    });
})

router.use('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;