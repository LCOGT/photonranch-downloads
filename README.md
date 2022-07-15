# Photon Ranch Downloads

This repository is responsible for assembling the zip files containing multiple fits files for downloading. It does not
expose an API, but instead defines lambda functions that are referenced by photonranch-api.

This app is written in node.js for easier asynchronous file handling.

## System Design

The main lambda function `zip` takes an array of filenames as input and returns a presigned URL for downloading the
zipped collection of files.

Since the list of files may be larger than the amount of memory available to the function, we rely on a stream that
builds the zip in S3. The zip is located in the main archive bucket, `photonranch-001`, in a 'folder' called downloads.

The `zip` lambda is used by the `downloadZip` endpoint in
[photonranch-api/api/handler.py](https://github.com/LCOGT/photonranch-api/blob/main/api/handler.py) in the function
`download_zip`.

## Testing and Deployment

To verify behavior, you can invoke the function with custom input data. For example, with the inputs defined in
`tests/example_requests/handler-short.json`, you can invoke the lambda function with

``` bash
$ serverless invoke --function zip --path tests/example_requests/handler-short.json

output:
{
    "statusCode": 200,
    "body": "{\"message\":\"https://photonranch-001.s3.amazonaws.com/downloads/SAF-1657865312.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAUOVR2PJKX66MFWFK%2F20220715%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20220715T060833Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEGcaCXVzLWVhc3QtMSJHMEUCIANkoWcdA%2Bxz%2B620pb34RD8%2FV79KeDXwKT43%2BFlfhsnaAiEAxkwsth139DtcCwBdauWK21ZWergxioVYT%2BXWEb6IhGwqhwMIn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARACGgwzMDYzODkzNTA5OTciDAsF2TyaRem4ckvbvSrbArRuuzQ%2FGTWq5WS0JyTolozxkBTQQe2Ka52t1mGzON%2FROJcr4YZRPKe1pa%2BNtgH%2F1ywCyogx5BHV31R%2FxtX4jo4N0umBlIrHkMl2iQOJZ56u6LoqWH5adVbTQ1sxA%2BLIr%2BKNugf%2FCS2imJE7Uz2U1EQO%2Bz3kfsmR5sh1r%2FB9isp7IxKU2ALsmT0Qjis1MDIC%2BknVcmzx1hPlvPpCRKrNqsAR7ZY5Icri5OlTUE68tuhtt6zmmJ4kICdhRx65X0Qxfi1wl%2BBzKFPW%2BQWbJPHCFuL6atTiu8szGwQ12XDfeHRSBXueCVKO3PTapyqHU4rRdp6rAuH0Z%2BTSn2zVgsjY0NlNrKPwHKrm%2FL3PPLqKPH1g91zfhfOD8qTJq9b7SWv54BR%2BJi4A%2BV5YmBNcLl2WfX7pwMt8IkK1vNn0WMIVA7A0e3vxjNWup6pect4Rc7OSNDgx6Bp3vgEp%2BnhDMN%2BIxJYGOp4Bfoul5Vd6osvvg9vbVelbgIKv9wIYFQCe4QspX32EXx5Ye412mNRFCZsbc4OQfe7U2ZcZ1xphyULoBPR345Dwt79c51zbTUFF%2FXRKEL6nq90AyzTf6AzUSkOcvkbgSD3rtmQXdnqRnfd0QAgyMCawz%2FHGfvym5cg22yZcCtbT9QGCh7kBH3pfPIJGZ%2FRZJghDgh2wX4QmCQALi%2FSmEz0%3D&X-Amz-Signature=ba58b26f4ee0be0e9b774a7781a443a1b99a2d382d100cf7465662e069e708d3&X-Amz-SignedHeaders=host&response-content-disposition=inline%3B%20filename%3D%22SAF-1657865312.zip%22\"}"
}
```

Modify the input data depending on the critera you are trying to test.

This app is managed by the Serverless Framework. As there is currently only one stage, depoloyments are as simple as
`$ serverless deploy`.

## Future

This code will become obsolete once Photon Ranch transitions to using the OCS Science Archive. Development efforts are
probably better spent on that task rather than making improvements here.
