import passport from 'passport';
import User from '../models/user';
import Cart from '../models/cart';
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
import {hostUrl} from '../config';

export const key = 'YOUR_CLIENT_ID_HERE';
export const secret = 'YOUR_CLIENT_SECRET_HERE';

export default function () {
    passport.use(new GoogleStrategy({
            clientID: key,
            clientSecret: secret,
            callbackURL: `${hostUrl}/auth/google/callback`,
            passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done) {
            if (req.user) {
                let query = {};
                if (req.user.google) {
                    query = {
                        'google.id': req.user.google.id
                    };
                }
                else if (req.user.facebook) {
                    query = {
                        'facebook.id': req.user.facebook.id
                    };
                }
                else if (req.user.twitter) {
                    query = {
                        'twitter.id': req.user.twitter.id
                    };
                }

                User.findOne(query, function (err, user) {
                    if (err) throw err;

                    if (user) {
                        return done(null, user);
                    }
                });
            } else {
                const query = {
                    'google.id': profile.id
                };

                User.findOne(query, function (err, user) {
                    if (err) throw err;

                    if (user) {
                        done(null, user);
                    } else {
                        const user = new User();

                        user.email = profile.emails[0].value;
                        user.profile.name = profile.displayName;

                        let filename = `${hostUrl}/images/anonymous.png`;

                        if(profile.photos[0].value && profile.photos[0].value.length > 0) {
                            const index = profile.photos[0].value.lastIndexOf("?sz=");
                            if (index >= 0) {
                                filename = profile.photos[0].value.substring(0, index);
                            }
                        }

                        user.profile.picture = filename;

                        user.google = {};
                        user.google.id = profile.id;
                        user.google.token = accessToken;

                        user.save(function(err) {
                            if (err) throw err;

                            const cart = new Cart({
                                user: user._id
                            });

                            cart.save(function (err) {
                                if (err) throw err;

                                return done(null, user);
                            });
                        });
                    }
                });
            }
        }));
};
