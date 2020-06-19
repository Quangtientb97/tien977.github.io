var crypto = require('crypto');
var uuid = require('uuid');
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
var fs = require("fs");
var moment = require('moment-timezone');
server.listen(8080);
require('events').EventEmitter.prototype._maxListeners = 100;
var con = mysql.createConnection({
 host: "b034kdbmfuvinopgjuse-mysql.services.clever-cloud.com",
  user: "u20nnlbcqemoj3jy",
  password: "t7zRtkGhq0F1svEcGKlC",
   database: "b034kdbmfuvinopgjuse"
});


var ketqua;
var device = {};
var app = {};
var app_control = {};


handleDisconnect();


//var now = moment();



/*password ---------------------------------------------------------*/
var getRandomString =function(length){
	return crypto.randomBytes(Math.ceil(length/2))
	.toString('hex') // convert to hexa
	.slice(0,length); // return required number of char
};

var sha512 = function(password,salt){
	var hash = crypto.createHmac('sha512',salt); 
	hash.update(password);
	var value = hash.digest('hex');
	return{
		salt:salt,
		passwordHash:value
	};
};

function saltHashPassword(userPassword){
	var salt = getRandomString(16);
	var passwordData = sha512(userPassword,salt);
	return passwordData;
};

function checkHashPassword(userPassword,salt){

	var passwordData = sha512(userPassword,salt);
	return passwordData;

};
/*end passwword-----------------------------------------------------------*/

/*bat su kien ket noi server-------------------------------------------------*/
io.sockets.on('connection', function(socket){
	var time = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
	// dang ki tai khoan
	socket.on('client-dang-ki-user', function(data){
		//var ketqua;
		//console.log(data);
		var name     		= data.name;
		var email    		= data.email;
		var password 		= data.password;
		var uid 			= uuid.v4();
		var plaint_password = password;
		var hash_data 		= saltHashPassword(plaint_password);
		var password  		= hash_data.passwordHash.slice(0,16);
		//console.log(password);
		var salt 			= hash_data.salt;
		
	  
		con.query('SELECT * FROM users where email=?',[email], function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 78',err.code);
			});

			if (result && result.length){
				ketqua = false;
				
				console.log("tai khoan da ton tai ");
			}
			else{
				ketqua = true;
				let sql1 = `INSERT INTO users(unique_id, name, email, encrypted_password, salt, create_at) values (  \'${uid}\', \'${name}\', \'${email}\', \'${password}\', \'${salt}\', \'${moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')}\')` ;
				con.query(sql1, function (err) {
						console.log('mysql error 90',err.code);
						//console.log('khong thanh cong');						
				});
			}
			socket.emit('ket-qua-dang-ki',{noidung: ketqua});
		});	
	});
	// dang nhap
	socket.on('client-dang-nhap-user', function(data){
		var email    	  = data.email;
		var user_password = data.password;		
		con.query('SELECT * FROM users where email=?',[email], function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 113',err.code);
			});
			if (result && result.length){
				var salt = result[0].salt;
				var encrypted_password = result[0].encrypted_password;
				var hashed_password = checkHashPassword(user_password,salt).passwordHash.slice(0,16);
				if (encrypted_password == hashed_password) {
					ketqua = true;
					//res.end(JSON.stringify(result[0]));
					// ô đẩy git cái phụ giống hệt cái hiện tại bên ô lên đc k
					console.log('dang nhap thanh cong');
					//console.log(result[0]);
					console.log('app socket.id: ' + socket.id);
				}
				else{
					ketqua = false;
					console.log('dang nhap k thanh cong');
				}
			}
			else{
				ketqua = false;
				console.log('dang nhap k thanh cong');
			}
			socket.emit('ket-qua-dang-nhap',{noidung: ketqua});
		});
		con.query('SELECT unique_id FROM users where email=?',[email], function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 78',err.code);
			});
			if (result && result.length){
				app[result[0].unique_id] = socket.id;
			}
		});
	});
	//update_data device
	socket.on('update_data', function(data){
		//console.log(data);
		//console.log('socket id la: ' + socket.id);
		let sql = `CREATE TABLE IF NOT EXISTS device${data.device_id}_log (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,ThoiGian TIMESTAMP, chieuquay VARCHAR(255), tocdo INT(10)) ENGINE = InnoDB` ;
		con.query(sql, function(err){
			con.on('error', function(err){
				console.log('mysql error 142',err.code);
			});
		});
		sql = `INSERT INTO device${data.device_id}_log(chieuquay, tocdo, Thoigian) values (  \'${data.chieuquay}\', \'${data.tocdo}\', \'${moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')}\')`;
		//console.log(sql);
		con.query(sql, function(err){
			con.on('error', function(err){
				console.log('mysql error 148',err.code);
			});
		});	
		socket.to(app[app_control[data.device_id]]).emit('send-app', data);
		//console.log('sent to' + app[app_control[data.device_id]]);

	});
	//join room
	socket.on('join-room-device', function(data){
		device[data] = socket.id;
		console.log('device id: ' + socket.id);
		con.query('SELECT unique_id FROM devices where device_id=?',[data], function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 78',err.code);
			});
			app_control[data] = result[0].unique_id;
		});

	});
	//dieu khien motor
	socket.on('receive-motor', function(data){
		//ghi log user
		con.query('SELECT unique_id FROM devices where device_id=?',[data.device_id], function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 78',err.code);
			});
			var user_unique_id = result[0].unique_id.slice(0,7);
			console.log("user_unique_id: " + user_unique_id);
			con.query(`CREATE TABLE IF NOT EXISTS user_${user_unique_id}_log (id INT NOT NULL PRIMARY KEY AUTO_INCREMENT, device_id INT(10), ThoiGian TIMESTAMP, chieuquay VARCHAR(255), mode INT(10)) ENGINE = InnoDB`, function(err){
				con.on('error', function(err){
					console.log('mysql error 182',err.code);
				});
			});

			//console.log(sql);
			con.query(`INSERT INTO user_${user_unique_id}_log(device_id, chieuquay, mode, Thoigian) values (${data.device_id}, \'${data.rota}\', \'${data.mode}\', \'${moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')}\')`, function(err){
				con.on('error', function(err){
					console.log('mysql error 148',err.code);
				});
			});
		});

		console.log(data);
		var device_id = data.device_id;
		var json = `{"rota":${data.rota},"mode":${data.mode}}`;	
		const obj = JSON.parse(json);
		socket.to(device[device_id]).emit('send-motor', obj);
		console.log('send to ' + device[device_id]);
		con.query(`SELECT COUNT(*) AS so_luong FROM device${data.device_id}_log`, function(err,result, fields){
			con.on('error',function(err){
				console.log('mysql error 179',err.code);
			});
			if (result && result.length){
				if (result[0].so_luong > 50000){
					con.query(`DELETE FROM device${data.device_id}_log`, function(err,result, fields){
						con.on('error',function(err){
								console.log('mysql error 184',err.code);
						});	
					console.log(`DELETE FROM device${data.device_id}_log`);			
					});
				}
			}
		});	
	});
	socket.on('disconnect', function(data){
		console.log(socket.id + ' disconnect');
	});	


	





//end io
});


function handleDisconnect() {
	 con = mysql.createConnection({
	 host: "b034kdbmfuvinopgjuse-mysql.services.clever-cloud.com",
	  user: "u20nnlbcqemoj3jy",
	  password: "t7zRtkGhq0F1svEcGKlC",
	   database: "b034kdbmfuvinopgjuse"
	});

	con.connect(function(err) {              // The server is either down
	    if(err) {                                     // or restarting (takes a while sometimes).
	      console.log('error when connecting to db: ', err);
	      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
	    }  
	    console.log('ket noi lai thanh cong');                                   // to avoid a hot loop, and to allow our node script to
	});                                     // process asynchronous requests in the meantime.
	                                          // If you're also serving http, display a 503 error.
	con.on('error', function(err) {
	    console.log('mysql error', err.code);
	    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
	      handleDisconnect();
	      console.log("ket noi lai");                         // lost due to either server restart, or a
	    } else {                                      // connnection idle timeout (the wait_timeout
	      console.log('mysql error handle',err);                                  // server variable configures this)
	    }
	});
}
