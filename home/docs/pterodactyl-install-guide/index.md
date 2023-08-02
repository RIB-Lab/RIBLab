# Pterodactylのインストール方法

**Pterodactylは，Ubuntu(18.04-22.04)，CentOS(7-8)，Debian(10-11)でインストール可能です。**

``apt -y install software-properties-common curl apt-transport-https ca-certificates gnupg``
<br>
``LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php``
<br>
``curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg``
<br>
``echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list``
<br>
``curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash``
<br>
``apt update``
<br>
``apt-add-repository universe``
<br>
``apt -y install php8.1 php8.1-{common,cli,gd,mysql,mbstring,bcmath,xml,fpm,curl,zip} mariadb-server nginx tar unzip git redis-server``
<br>
**1行ずつ，rootで実行してください。rootではない場合は，sudoをつけてください**

### Composerという，PHPの依存関係をダウンロード
``curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer``

### Panelのダウンロード
``mkdir -p /var/www/pterodactyl``
<br>
``cd /var/www/pterodactyl``
<br>
``curl -Lo panel.tar.gz https://github.com/pterodactyl/panel/releases/latest/download/panel.tar.gz``
<br>
``tar -xzvf panel.tar.gz``
<br>
``chmod -R 755 storage/* bootstrap/cache/``
### Panelのデータベースを作成
``mysql -u root -p``
<br>
``CREATE USER 'pterodactyl'@'127.0.0.1' IDENTIFIED BY 'yourPassword';``
<br>
``CREATE DATABASE panel;``
<br>
``GRANT ALL PRIVILEGES ON panel.* TO 'pterodactyl'@'127.0.0.1' WITH GRANT OPTION;``
<br>
``exit``
### 環境設定のコピー
``cp .env.example .env``
<br>
``composer install --no-dev --optimize-autoloader``
<br>
``php artisan key:generate --force``
### 環境構成
``php artisan p:environment:setup``
<br>
Egg Author Email: Eggのデフォルトのメールアドレスを設定
<br>
Application URL: http://PanelのIPまたはドメイン
<br>
Cache Driver: 何も打たずエンター
<br>
Session Driver: 何も打たずエンター
<br>
Queue Driver: 何も打たずエンター
<br>
Enable UI based settings editor?: 何も打たずエンター

``php artisan p:environment:database``
Database Host: 何も打たずエンター
<br>
Database Port: 何も打たずエンター
<br>
Database Name: 何も打たずエンター
<br>
Database Username: 何も打たずエンター
<br>
Database Password: さっき設定したデータベースのパスワード

### ユーザーの追加
``php artisan migrate --seed --force``
<br>
``php artisan p:user:make``
<br>
Is this user administrator?: yesと入力(管理者権限が付与されます)
<br>
Email Address: 自分のメールアドレスを入力
<br>
Username: 自分のユーザー名
<br>
First Name: 自分の名
<br>
Last Name: 自分の姓
<br>
Password: 難しめのパスワード**(8文字以上，大文字，小文字，1つ以上の数字)**
### 権限を設定

<br>

**CentOS以外**
<br>
``chown -R www-data:www-data /var/www/pterodactyl/*``
<br>

**CentOSでNginxを使っている場合**
<br>
``chown -R nginx:nginx /var/www/pterodactyl/*``
<br>

**CentOSでApacheを使っている場合**
<br>
``chown -R apache:apache /var/www/pterodactyl/*``
<br>

### スケジューラーの設定
``sudo crontab -e``
<br>
``* * * * * php /var/www/pterodactyl/artisan schedule:run >> /dev/null 2>&1``
<br>
一番最後の文に↑の文を追加します

### キューワーカー(常に起動するやつ)の作成
``nano /etc/systemd/system/pteroq.service``
<br>

```# Pterodactyl Queue Worker File
# ----------------------------------

[Unit]
Description=Pterodactyl Queue Worker
After=redis-server.service

[Service]
# On some systems the user and group might be different.
# Some systems use `apache` or `nginx` as the user and group.
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/pterodactyl/artisan queue:work --queue=high,standard,low --sleep=3 --tries=3
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Ctrl+Sで保存，Ctrl+Xで閉じて，下記のコマンドを実行
<br>
``sudo systemctl enable --now redis-server``
<br>
``sudo systemctl enable --now pteroq.service``

### ウェブサーバーの設定
SSLを使用するNginxのみ紹介しますが，SSLを使用しない場合や，Apacheを使用する場合は，Pterodactyl公式ドキュメントをご確認ください
<br>
``rm /etc/nginx/sites-enabled/default``
<br>
``nano /etc/nginx/sites-availble/pterodactyl.conf``
<br>
```
server_tokens off;

server {
    listen 80;
    server_name ドメイン;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ドメイン;

    root /var/www/pterodactyl/public;
    index index.php;

    access_log /var/log/nginx/pterodactyl.app-access.log;
    error_log  /var/log/nginx/pterodactyl.app-error.log error;

    # allow larger file uploads and longer script runtimes
    client_max_body_size 100m;
    client_body_timeout 120s;

    sendfile off;

    # SSL Configuration - Replace the example <domain> with your domain
    ssl_certificate /etc/letsencrypt/live/ドメイン/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ドメイン/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
    ssl_prefer_server_ciphers on;

    # See https://hstspreload.org/ before uncommenting the line below.
    # add_header Strict-Transport-Security "max-age=15768000; preload;";
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Robots-Tag none;
    add_header Content-Security-Policy "frame-ancestors 'self'";
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy same-origin;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param PHP_VALUE "upload_max_filesize = 100M \n post_max_size=100M";
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTP_PROXY "";
        fastcgi_intercept_errors off;
        fastcgi_buffer_size 16k;
        fastcgi_buffers 4 16k;
        fastcgi_connect_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_read_timeout 300;
        include /etc/nginx/fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

<br>
ドメインと書いてあるところにサイトのドメインを代入します。
<br>

Ctrl+Sで保存，Ctrl+Xで閉じて下記のコマンドを入力します。
<br>
``sudo apt update``
<br>
``sudo apt install -y certbot``

<br>

**Nginxを使用している場合**
<br>
``sudo apt install -y python3-certbot-nginx``
<br>

**Apacheを使用している場合**
<br>
``sudo apt install -y python3-certbot-apache``
<br>
### SSLの認証

**80番が開けられてNginxを使用している場合**
<br>
```certbot certonly --nginx -d ドメイン```
<br>

**80番が開けられてApacheを利用している場合**
<br>
``certbot certonly --apache -d ドメイン``
<br>

**80番が開けられない場合**
<br>
``certbot -d ドメイン --manual --preferred-challenges dns certonly``
<br>
ドメインと書いてあるところにサイトのドメインを代入します。
<br>
### SSLの自動更新設定
``sudo crontab -e``
<br>
``0 23 * * * certbot renew --quiet --deploy-hook "systemctl restart nginx"``
<br>
をスケジューラーで追加した文の下に書きます。
<br>
**Nginxを使用している場合はそのまま，Apacheを使用している場合は``systemctl restart nginx``を``systemctl restart apache2``に書き換えてください**
<br>
Ctrl+Sで保存，Ctrl+Xで閉じて下記のコマンドを入力してください
<br>
``sudo ln -s /etc/nginx/sites-available/pterodactyl.conf /etc/nginx/sites-enabled/pterodactyl.conf``
<br>
**↑CentOSの場合は実行しなくていいです**
<br>
``sudo systemctl restart nginx``
## これでサイトにアクセスしてみてください！Panelが表示されると思います！
