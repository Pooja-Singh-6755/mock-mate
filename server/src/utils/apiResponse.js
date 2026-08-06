function success(res, data , message = 'ok' , statusCode=200) {
    return res.status(statusCode).json({ success: true , message , data});
}

function failure(res , data , message = 'something went wrong' , statusCode = 500) {
 return res.status(statusCode).json({success: false , message});
}

module.exports = { success , failure}