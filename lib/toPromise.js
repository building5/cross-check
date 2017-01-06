module.exports = fn =>
  new Promise((resolve, reject) => {
    fn((err, val) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(val);
    });
  });
