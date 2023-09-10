---
draft: false
date: 2023-09-10
categories:
  - plugins
authors:
  - Quarri6343
---

# お手軽インスタンスダンジョン生成を実現した話 - RIBLaBブログ

Minecraftのプラグインの華であると言っても過言でない、ダンジョンシステム。  
しかし、ネットを見渡しても圧倒的に作り方に関するドキュメントが少ないです！  
ということで、今回は私がRIBLabでどのようにしてダンジョン生成システムを作ったのか紹介していきます。 
<!-- more -->
!!!Warning
    このダンジョンシステムはまだ大量のユーザーによるプレイテストが行われていません。     
    このストラテジーを参考にするかどうかは読者にお任せします。   

# 既存のプラグインじゃだめなの？
はい。オープンソースで高クォリティのプラグインは探した限りでは存在しませんでした。

# 種類の選択

最初に、Minecraftのプラグイン界隈でダンジョンといえばいくつかの種類があります。  
これらの中から作りやすさと面白さを両立した選択肢を選ばなくてはいけません。  
とりあえず思いついた順に主要な例を挙げてみます。
<br>

1. RPGフィールドの特定の場所がダンジョンになっていて、入っても沸く敵の種類が変わったりたまにボスが沸いたりするだけでイベントは起きない
<br>

2. RPGフィールドの特定の場所がダンジョンになっていて、入るとイベントが起るが他の人はその間入れなくなる  
<br>

3. RPGフィールドの特定の場所がダンジョンになっていて、入るとプレイヤーごとにパケット制御でイベントが起きたり敵が沸いたりする  
<br>
 "3."のパケット制御はWynncraftが有名な例ですね。  
 しかし、RIBLabの生活鯖にはRPGフィールドを建築する人手の余裕がなく、またメインワールドにダンジョンを埋め込むとリセット時大変なことになるので、これらは無条件でボツになりました。  
 <br>

4. ダンジョンに入るフラグが立つと予め生成されているダンジョンワールドに転送される。誰かがダンジョンにいる間は他のパーティは入れない。　　
<br>

5. ダンジョンに入るフラグが立つと予め生成されているダンジョンワールドに転送されるが、パケット制御でイベントが起きるので何パーティでも同時に入れる  
<br>
 "5."に関してはちょっと実例が思いつきません..."4."は普通にあります。 
 ここらへんは定義上「インスタンスダンジョン」ではないそうです。    
 これらは有力な候補なのですが、ダンジョンの数が増えると大量のワールドが無造作にトップディレクトリに転がることになるので、できればもう少しよい方法を探したいです  
 <br>

6. ダンジョンに入ると固定生成の新規ダンジョンワールドに飛ばされる  
<br>

7. ダンジョンに入るとランダム生成の新規ダンジョンワールドに飛ばされる  
<br>

 このタイプのダンジョンは「インスタンスダンジョン」であり、ブロック破壊ができる場合もあります。  
 "7."はHypixel Skyblockでおなじみのあれです。  
 これらのダンジョンは使い捨てであり、プレイヤーがダンジョンから退出すると自動的にワールドが削除されます。
 <br>

これらの中から私は"6. "を選びました。  
ランダム生成はよほど熟達していないとキューブ状の部屋を繋いで終わりになってしまうのですが、それを避けたかった、でもそこまで簡素なものにしたくない、という思いが大きいです。  
あと、固定生成でもランダムイベントなどでランダム性を補うことは十分可能であることをDIABLO4などのダンジョンクロウラーゲームを遊ぶ過程で知っており、十分な面白さが確保できると考えました。

# 直接ワールドを生成しよう

新規ダンジョンワールドを作るためにまず考えたのは、普通にBukkitの機能を使ってダンジョンに入るときワールドを生成することです。  
つまりこのようなコードです：  

```
    public World create(String name){
        String dungeonName = getPrefixedDungeonName(name);
        WorldCreator wc = new WorldCreator(dungeonName, new NamespacedKey(TradeCore.getInstance(), name));
        wc.generator(new EmptyChunkGenerator());
        World world = wc.createWorld();
        world.setAutoSave(false);
        world.setKeepSpawnInMemory(false);
        world.setGameRule(GameRule.KEEP_INVENTORY, true);
        world.setGameRule(GameRule.DO_DAYLIGHT_CYCLE, false);
        world.setGameRule(GameRule.DO_MOB_SPAWNING, false);
        world.setGameRule(GameRule.DO_WEATHER_CYCLE, false);
        world.setTime(6000);
        world.setSpawnLocation(new Location(world, spawnLoc.getX(),  spawnLoc.getY(), spawnLoc.getZ()));
        dungeons.add(world);
        return world;
    }
```
このコードではWorldCreatorというBukkitの標準機能に空のチャンクジェネレータを渡すことで空のワールドを生成します。  
一見シンプルですが、ダンジョンの基板としては100点満点のものを出力してくれます。  
<br>
しかし、これでダンジョン完成ではありません。  
この方法でワールドを生成すると、serverが5秒近く固まります。  
Multiverseプラグインでワールドを生成するときもそうですが、ワールドの生成は非常に重い作業です。  
<br>
<br>
そこで、私は考えました。  
ワールド生成を別スレッドにすれば、サーバーを固めずにダンジョンを作れるできるのでは?  
さっそくBukkitRunnable.runTaskLaterAsyncにcreate(String name)を放り込んで実行してみます。  
<br>
<br>
うまくいきませんでした...  
調べたところ、Minecraftはサーバーソフトウェア込みでも複数スレッドでのワールド生成に対応していないそうです。  
Minecraftのコード自体を書き換えればいけそうですが、そこまでやると莫大な時間がかかってしまいます。  

# ワールドをコピーしよう

私の考えた次なる方法は、既存のワールドをコピーすればいいということです。  
早速プラグインのconfigフォルダに前章で作った空のワールドを放り込み、FileUtils.copyFolder的なメソッドでワールドをコピーしてきます。  
そして、ワールドフォルダの名前をプログラムで適当に書き換えます。  
<br>
<br>
いけました！爆速で空のワールドを大量に生成することができました。  
なんとMinecraftにはワールドのフォルダ名を変えるだけでワールド同士を別のワールドとして認識してくれるというとんでもない機能があるので、ただ単純にコピペしてリネームすれば終わりです。
<br>
<br>
その後、空のワールドは設定に関係なく必要なパーツなのでコンフィグではなくプラグインの.jarのリソースフォルダに埋め込みました。  
現時点でのワールド生成コードの全貌は以下の通りです:  

```
    public void create(String name){
        String dungeonName = getPrefixedDungeonName(name);
        
        Bukkit.getLogger().info("ワールドを生成中");
        
        File destDir = new File(dungeonName);
        try {
            Utils.copyFolder(tmpDirName, destDir);
        } catch (IOException e) {
            e.printStackTrace();
        }
        File file = new File( dungeonName + "/uid.dat");
        file.delete();
        WorldCreator wc = new WorldCreator(dungeonName, new NamespacedKey(TradeCore.getInstance(), name));
        wc.generator(new EmptyChunkGenerator());
        World world = Bukkit.getServer().createWorld(wc);
        Bukkit.getLogger().info("ワールドを生成完了");
        
        world.setAutoSave(false);
        world.setGameRule(GameRule.KEEP_INVENTORY, true);
        world.setGameRule(GameRule.DO_DAYLIGHT_CYCLE, false);
        world.setGameRule(GameRule.DO_MOB_SPAWNING, false);
        world.setGameRule(GameRule.DO_WEATHER_CYCLE, false);
        world.setTime(6000);
        world.setSpawnLocation(new Location(world, spawnLoc.getX(),  spawnLoc.getY(), spawnLoc.getZ()));
        dungeons.add(world);
    }
```

.jarの中から外にファイルをコピーするためには、通常のファイルコピーと比べてややトリッキーなコードを書く必要があるので、ここに共有しておきます。

```
    public static void copyFolder(String srcDirName, File destDir) throws IOException {
        final File jarFile = new File("plugins/TradeCore.jar");
        JarFile jar = null;
        try {
            jar = new JarFile(jarFile);
        } catch (FileNotFoundException e){
            Bukkit.getLogger().severe("プラグインの名前を変えないで下さい！リソースが展開できません！");
            e.printStackTrace();
        }
        for (Enumeration<JarEntry> entries = jar.entries(); entries.hasMoreElements();) {
            JarEntry entry = entries.nextElement();
            if (entry.getName().startsWith(srcDirName + "/") && !entry.isDirectory()) {
                File dest = new File(destDir, entry.getName().substring(srcDirName.length() + 1));
                File parent = dest.getParentFile();
                if (parent != null) {
                    parent.mkdirs();
                }
                FileOutputStream out = new FileOutputStream(dest);
                InputStream in = jar.getInputStream(entry);
                try {
                    byte[] buffer = new byte[8 * 1024];
                    int s = 0;
                    while ((s = in.read(buffer)) > 0) {
                        out.write(buffer, 0, s);
                    }
                } finally {
                    in.close();
                    out.close();
                }
            }
        }
        jar.close();
    }
```

詳細についてはここでは説明を省きます。

# 地形を作ろう

空のワールドはダンジョンとは呼べません。  
ダンジョンの地形について、ワールドごとテンプレートとしてコンフィグに配置してもいいのですが、今回は大規模なものを作る予定がなかったのでFastAsyncWorldEditのスケマティックを空のワールドに配置することにしました。  
以下の例では.jarにスケマティックを埋め込んでいますが、私としてはプロジェクトが大規模になってきたらダンジョンの情報ごとコンフィグに移す予定です。  

```
    public void create(String name){ (一部略)
        //...

        //ダンジョン名に対応したschemをresourceからコピーする
        File instantiatedSchemFile = new File(pasteSchemDir + "/" + dungeonName + ".schem");
        boolean fileHasCopied = false;
        try {
            fileHasCopied = Utils.copyFile(copySchemDir + "/" + dungeonName + ".schem", instantiatedSchemFile);
        } catch (IOException e) {
            e.printStackTrace();
        }
        
        if(!fileHasCopied){
            Bukkit.getLogger().severe("schemファイルが見つかりません：" + copySchemDir + "/" + dungeonName + ".schem");
            dungeons.add(world);
            return;
        }
        
        //schemから地形生成
        Clipboard clipboard = null;
        ClipboardFormat format = ClipboardFormats.findByFile(instantiatedSchemFile);
        try (ClipboardReader reader = format.getReader(new FileInputStream(instantiatedSchemFile))) {
            clipboard = reader.read();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        com.sk89q.worldedit.world.World weWorld = BukkitAdapter.adapt(world);
        try (EditSession editSession = WorldEdit.getInstance().newEditSession(weWorld)) {
            Operation operation = new ClipboardHolder(clipboard)
                    .createPaste(editSession)
                    .to(BlockVector3.at(fallBackSpawnLoc.getX(), fallBackSpawnLoc.getY(), fallBackSpawnLoc.getZ()))
                    .copyEntities(true)
                    .build();
            Operations.complete(operation);
        }

        //...
    }
```
WorldEdit系列のプラグインを使うときにはEditSesstionの開閉という単位で操作を行います。  
これはワールドを安全に操作するためのWorldEditなりのリソース管理方法らしいです。  
<br>
<br>
これでコマンドを打つだけでダンジョンと地形が自動生成されるようになりました。  

# ダンジョンが消せない！
ダンジョンを生成する方法が分かったところで、今度は消す方法についてです。  
ダンジョンを使い終わったら、ファイル操作ツールでワールドフォルダを消すだけ。  
ただそれだけなのですが、何故かJava標準ライブラリやFileUtilsで稼働中のワールドフォルダを消そうとすると「ファイルが使用中のため消せません」と言われます。  
<br>
どうやらワールドを消す前に事前に  
・ ワールド内のプレイヤーを退避  
・ ワールドをアンロード  
の手順を踏む必要があるそうです。  
<br>
早速やってみましょう。  
<br>
```
    public void killInsance(World world){
        world.getPlayers().forEach(this::tryLeave);
        File folder = world.getWorldFolder();
        Bukkit.unloadWorld(world, false);
        try {
            FileUtils.deleteDirectory(folder);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
```
<br>
アンロードまではいけますがやっぱり消せません。  
他のプラグインのコードを覗いて見ると、どうやらファイルを一つずつ消さないと上手く消えないそうです。  
その後試行錯誤したのですが、ここで解説するのは野暮なので答えだけ貼っておきます。  

```
    /**
     * フォルダーを完全に削除する
     *
     * @param file　削除したいフォルダーのパス
     * @return 削除に成功したかどうか
     */
    @ParametersAreNonnullByDefault
    public static boolean deleteFolder(File file) {
        try (Stream<Path> files = Files.walk(file.toPath())) {
            files.sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
            return true;
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }
    }
```

これでワールドフォルダに大量のダンジョンが転がることはなくなりました。

# その他
ここまでやったら後一息です。
<br>
・生成のasync化  
ダンジョンのコピーと地形生成はどちらも非同期にできます。  
Fast"Async"WorldEditを使っているので、当然と言えば当然ですね。  
create(String name)をおなじみrunTaskLaterAsyncに放り込むだけです。  

・マルチインスタンス化  
ダンジョンが1個しか生成できないのは困るので、ダンジョンとそのデータをマップに放り込んで検索したり、被らない名前でワールドを自動生成できるようにしましょう。  
これに関してもここまで読んでくれた方なら楽勝だと思います。  
分からなくなった場合[これ](https://github.com/RIB-Lab/TradeCore/commit/a89f1cb031c9299db9ac34938858de3cee4d5dd9)を参考にしてみて下さい。

・ダンジョンの敵、ギミック、ゴール、報酬の設定  
別の機会に扱います。

# おわりに

プラグインに慣れている人から見ると、こんなこと当たり前のことじゃん！もっとよい方法があるだろ！と思うかもしれません。  
しかし、誰もダンジョンプラグインのソースコードを公開しておらず、誰も解説記事を書いていない現状では、もしかしたら誰かの導きになるかもしれない、そう思ってこの記事をかきました。  
(あと単純に一人でプラグインを書き続けるのに飽きた...)  
<br>
それではまた！