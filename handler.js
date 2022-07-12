const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  httpOptions: {
    timeout: 300000 // 5min; Should Match Lambda function timeout
  }
});

const UPLOAD_BUCKET_NAME = process.env.BUCKET_NAME;
const URL_EXPIRE_TIME = parseInt(process.env.URL_EXPIRE_TIME);

const archiver = require('archiver');
const stream = require('stream');


module.exports.getZipSignedUrl = async (event) => {
  console.info(event)

  const prefix = `data`;
  let files = event.filenames

  if (files.length == 0) {
    console.log("No files to zip");
    return result(404, "No pictures to download");
  }
  console.info(`Number of files to zip: ${files.length}`)
  console.info("Files to zip: ", files);

  const filesHash = fileListHash(files) // Use this to check if we already have a zip we can use
  const site = files[0].split('-')[0]

  try {
    files = files.map(file => {
      return {
        fileName: file,
        key: prefix + '/' + file,
        type: "file"
      };
    });

    const timestamp_s = Math.floor(Date.now() / 1000)
    const destinationKey = `downloads/${filesHash}.zip`
    console.info("Name of zip file in s3: ", destinationKey);

    // Try to grab the zip in case it already exists
    let presignedUrl = await getSignedUrl(UPLOAD_BUCKET_NAME, destinationKey, URL_EXPIRE_TIME, `${site}-${timestamp_s}.zip`);

    // If it doesn't exist, then run the zip routine
    if (!presignedUrl) {
      await streamToZipInS3(files, destinationKey);
      presignedUrl = await getSignedUrl(UPLOAD_BUCKET_NAME, destinationKey, URL_EXPIRE_TIME, `${site}-${timestamp_s}.zip`);
    }

    console.info("presignedUrl: ", presignedUrl);

    if (!presignedUrl) {
      return result(500, null);
    }
    return result(200, presignedUrl);
  }
  catch (error) {
    console.error(`Error in handler: ${error}`);
    return result(500, null);
  }
}


/** 
 ** Helper Methods 
 **/

function result(code, message) {
  return {
    statusCode: code,
    body: JSON.stringify(
      {
        message: message
      }
    )
  }
}

/* Convert the list of files into a unique string */
function fileListHash(files) {
  return stringHashCode(files.sort().join(''))
}
function stringHashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; ++i)
    hash = Math.imul(31, hash) + str.charCodeAt(i)
  return hash | 0
}

async function streamToZipInS3(files, destinationKey) {
  await new Promise(async (resolve, reject) => {
    var zipStream = streamTo(UPLOAD_BUCKET_NAME, destinationKey, resolve);
    zipStream.on("error", reject);

    var archive = archiver("zip");
    archive.on("error", err => {
      throw new Error(err);
    });
    archive.pipe(zipStream);

    for (const file of files) {
      if (file["type"] == "file") {
        archive.append(getStream(UPLOAD_BUCKET_NAME, file["key"]), {
          name: file["fileName"]
        });
      }
    }
    archive.finalize();
  })
    .catch(err => {
      console.log(err);
      throw new Error(err);
    });
}

function streamTo(bucket, key, resolve) {
  var passthrough = new stream.PassThrough();
  s3.upload(
    {
      Bucket: bucket,
      Key: key,
      Body: passthrough,
      ContentType: "application/zip",
      ServerSideEncryption: "AES256"
    },
    (err, data) => {
      if (err) {
        console.error('Error while uploading zip')
        throw new Error(err);
        reject(err)
        return
      }
      console.log('Zip uploaded')
      resolve()
    }
  ).on("httpUploadProgress", progress => {
    console.log(progress)
  });
  return passthrough;
}

function getStream(bucket, key) {
  let streamCreated = false;
  const passThroughStream = new stream.PassThrough();

  passThroughStream.on("newListener", event => {
    if (!streamCreated && event == "data") {
      const s3Stream = s3
        .getObject({ Bucket: bucket, Key: key })
        .createReadStream();
      s3Stream
        .on("error", err => passThroughStream.emit("error", err))
        .pipe(passThroughStream);

      streamCreated = true;
    }
  });

  return passThroughStream;
}

async function getSignedUrl(bucket, key, expires, downloadFilename) {
  const exists = await objectExists(bucket, key);
  if (!exists) {
    console.info(`Object ${bucket}/${key} does not exists`);
    return null
  }

  let params = {
    Bucket: bucket,
    Key: key,
    Expires: expires,
  };
  if (downloadFilename) {
    params['ResponseContentDisposition'] = `inline; filename="${encodeURIComponent(downloadFilename)}"`;
  }

  try {
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (err) {
    console.error(`Unable to get URL for ${bucket}/${key}`, err);
    return null;
  }
};

function objectExists(bucket, key) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: key
    };
    s3.headObject(params).on('success', response => {
      resolve(true) // object exists (returned 200)
    }).on('error', error => {
      resolve(false) // object does not exist (returned 404)
    }).send();
  })
}
