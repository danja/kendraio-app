export const environment = {
  urlPrefix: 'https://dev.app.kendra.io/',
  production: true,
  adapterConfig: 'https://kendraio.github.io/kendraio-adapter/config.json',
  auth0: {
    clientID: 'BpSIsaDagBnDpAZyfJOVoAqG1r041Nj7',
    domain: 'kendraio.eu.auth0.com',
    responseType: 'token id_token',
    redirectUri: 'https://kendraio-project.firebaseapp.com/callback',
    audience: 'https://kendraio.eu.auth0.com/api/v2/',
    scope: 'openid profile'
  }
};
