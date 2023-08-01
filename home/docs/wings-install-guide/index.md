# Wingsインストール
### Dockerのインストール
``curl -sSL https://get.docker.com/ | CHANNEL=stable bash``
<br>
``systemctl enable --now docker``
### Wingsのインストール
<br>
``mkdir -p /etc/pterodactyl``
<br>
``curl -L -o /usr/local/bin/wings "https://github.com/pterodactyl/wings/releases/latest/download/wings_linux_$([[ "$(uname -m)" == "x86_64" ]] && echo "amd64" || echo "arm64")"``
<br>
``chmod u+x /usr/local/bin/wings``
<br>
Panelを開き，ノードを作成してください。作成してConfigrationをクリックし，Generate Tokenをクリックします。
<br>
でてきたトークンをコピーし，Wingsをインストールするサーバーに貼り付けて実行します
<br>
**できないときは手動で実行してください**
<br>
``sudo apt update``
<br>
``sudo apt install -y certbot``

<br>

### SSLの認証
<br>

**80番が開けられる場合**
<br>
``certbot certonly --standalone -d ドメイン``
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
``0 23 * * * certbot renew --quiet --deploy-hook "systemctl restart wings"``
<br>
を追加します。
<br>
<br>
Ctrl+Sで保存，Ctrl+Xで閉じて下記のコマンドを入力してください
<br>

### Wingsのデバッグ起動
``sudo wings --debug``
を実行して正常に動作するか確認してください。エラーが出た場合は，再度構成ファイルに誤りがないかを確信して実行してみてください。

### デーモン化
``nano /etc/systemd/system/wings.service``
```
[Unit]
Description=Pterodactyl Wings Daemon
After=docker.service
Requires=docker.service
PartOf=docker.service

[Service]
User=root
WorkingDirectory=/etc/pterodactyl
LimitNOFILE=4096
PIDFile=/var/run/wings/daemon.pid
ExecStart=/usr/local/bin/wings
Restart=on-failure
StartLimitInterval=180
StartLimitBurst=30
RestartSec=5s

[Install]
WantedBy=multi-user.target
```
<br>
Ctrl+Sで保存，Ctrl+Xで閉じて下記のコマンドを実行します
<br>
``systemctl enable --now wings``
<br>
