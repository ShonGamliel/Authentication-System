# Authentication-System
Authentication system, designed to work with Cross-Origin


Because of the limits of the new browsers, server-side apps can't set and read client's cookies if the server's domain doesn't match the client's domain.
I built a new authentication system, that will be also dynamic for every app.

Make sure to put the code that on "client.js" file, in your main code, before all the axios requests.

If you dont use axios:

basically, what the code do, is listening for every data that coming back from the server,
and if it recognize that the data has "authenticated: true" property, its setting a session id cookie,
and if it recognize a "logout: true" property, it removes the session id cookie.
