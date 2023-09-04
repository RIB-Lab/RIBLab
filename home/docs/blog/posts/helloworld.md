---
draft: false
date: 2023-09-05
categories:
  - plugins
authors:
  - Quarri6343
---

# MythicCrucibleもどきを自作した話-RIBLaBブログ

このブログでは、Minecraftでプラグインを開発する私が届けたい、プラグインを作る上で約に立つ読み物を提供します。<br>
想定読者層：既にある程度Minecraftのプラグインが書ける人

<!-- more -->

# 自己紹介

# MythicCrucibleについて

皆さんは「[MythicMobs](https://www.spigotmc.org/resources/%E2%9A%94-mythicmobs-free-version-%E2%96%BAthe-1-custom-mob-creator%E2%97%84.5702/)」を使ってモブを作ったことがありますか？<br>
MythicMobsはとても有名な、すごくカスタマイズされたモブやアイテムを作ることができるプラグインです。<br>
マイクラマルチをやっていると、時折変なAIを持った敵を見かけますが、あれもこれもMythicMobsで作られています。<br>
しかも、あれら何十種類もの性質は全てプログラムではなくyamlだけで定義することができます。<br>
色んな[大手サーバー](https://github.com/takatronix/MythicMobs)がこぞって使用するのも納得できますね。<br>
[MythicCrucible](https://mythiccraft.io/index.php?resources/crucible-create-unbelievable-mythic-items.2/)はそのアドオンで、MythicMobsのアイテムに更に色んなカスタムを加えられるプラグインです。(買っていないので詳細は知りませんが)

# 自作する理由

まず第一に、**有料**だからです。<br>
MythicMobsとMythicCrucbieを両方買うと結構な値段します。<br>
これはお財布に優しくありません。
<br>
<br>
ではこれが無料だったら使いたいかといわれても、そうはなりません。<br>
MythicCrucibleは**クローズドソース**です。<br>
無料でオープンソースなら改造して自分のプラグインのシステムに組み込むことが容易ですが、コードを編集できないとなるとプラグインの既定の機能しか使えないため、将来の拡張性を考えると微妙です。<br>
例えば、最近の1.20で追加された[カスタムアーマー](https://www.youtube.com/watch?v=WsL05TF3VeI)の概念ですが、MythicCrucibleに組み込めるかと言われると恐らくNOです。<br>
カスタムアーマーをプラグインで追加するためには、私の知りうる限りでは以下のようなコードを書く必要があります(NBTAPI使用)

```
    @Override
    public ItemStack apply(ItemStack originalValue, ItemStack modifiedValue) {
        NBTItem item = new NBTItem(modifiedValue);
        item.setInteger(NBTTagNames.ARMOR_HIDEFLAGS.get(), 135);//hideattribute + hidearmorupgrade
        NBTCompound nbtList = item.getOrCreateCompound(NBTTagNames.ARMOR_TRIM.get());
        nbtList.setString(NBTTagNames.ARMOR_MATERIAL.get(), "minecraft:" + getParam());
        nbtList.setString(NBTTagNames.ARMOR_PATTERN.get(), "minecraft:" + getParam());
        modifiedValue = item.getItem();
        return modifiedValue;
    }
```

これをyamlで追加するためには、MythicCrucibleを拡張する必要があるでしょう。<br>
そのためのAPIが必要ですが、[公式wiki](https://git.mythiccraft.io/mythiccraft/mythiccrucible/-/wikis/home)を見る限り提供されていません。<br>
これではいくら綺麗な装備を作れたとしてもMythicCrucibleの前では腐ってしまいます。
<br>
<br>
ではでは、MythicCrucibleがオープンソースだったら使いたいかというと、答えはやっぱりNOです。<br>
理由は至ってシンプル。**コードが汚すぎます**。<br>
私はMythicCrucibleを所有していないので詳細は分からないのですが、無料版のMythicMobsをダウンロードして、
何十種類ものyamlを解析するためにどのようなプログラムを書いているのか垣間見ることはできます。<br>
私は最近MythicMobsについて知るために、yamlの代わりにJava言語でMythicMobsのモブを記述できるアドオンを開発しました。<br>
以下に示すのはMythicMobsの全てのMobのベースとなっているMobTypeというクラスのコンストラクタをJavaスクリプティングに対応させたもの(の最初の数十行)です。<br>

```
    public MMJavaMobType(MobExecutor manager, String internalName, String mobtype, String displayName) {
        this.despawnMode = DespawnMode.NORMAL;
        this.optionShowHealthInChat = false;
        this.optionSilent = false;
        this.optionNoAI = false;
        this.optionGlowing = false;
        this.optionInvincible = false;
        this.optionCollidable = true;
        this.optionNoGravity = true;
        this.optionInteractable = true;
        this.optionHealOnReload = false;
        this.optionLockPitch = false;
        this.useBossBar = false;
        this.mount = Optional.empty();
        this.rider = Optional.empty();
        this.levelmods = Lists.newArrayList();
        this.aiGoalSelectors = Lists.newArrayList();
        this.aiTargetSelectors = Lists.newArrayList();
        this.aiPathfindingMalus = Maps.newConcurrentMap();
        this.hasCombatSkills = false;
        this.skills = Maps.newConcurrentMap();
        this.timerSkills = Queues.newConcurrentLinkedQueue();
        this.signalSkills = Maps.newConcurrentMap();
        this.usingTimers = false;
        this.alwaysShowName = true;
        this.showNameOnDamage = true;
        this.optionTTFromDamage = true;
        this.optionTTDecayUnreachable = true;
        this.repeatAllSkills = false;
        this.preventOtherDrops = false;
        this.preventRandomEquipment = false;
        this.preventLeashing = false;
        this.preventRename = true;
        this.preventEndermanTeleport = true;
        this.preventItemPickup = true;
        this.preventSilverfishInfection = true;
        this.preventSunburn = false;
        this.preventExploding = false;
        this.preventMobKillDrops = false;
        this.preventTransformation = true;
        this.preventMounts = false;
        this.passthroughDamage = false;
        this.applyInvisibility = false;
        this.digOutOfGround = false;
        this.usesHealthBar = false;
        this.spawnVelocityX = 0.0;
        this.spawnVelocityXMax = 0.0;
        this.spawnVelocityY = 0.0;
        this.spawnVelocityYMax = 0.0;
        this.spawnVelocityZ = 0.0;
        this.spawnVelocityZMax = 0.0;
        this.spawnVelocityXRange = false;
        this.spawnVelocityYRange = false;
        this.spawnVelocityZRange = false;
        this.disguise = null;
        this.fakePlayer = false;
```

これを読んで正気を保てるのはほんの数人でしょう。私は無理でした。<br>
MythicMobsはyamlの要素を全て一つずつ解析して、モブの何百種類とある変数に代入しています。あほです。<br>
これを書いた時、私はMythicCruciblesを使わずにフレキシブルなスクリプティングシステムを開発しようと決意を固めました。

# 最初の課題

アイテムをyamlにする場合、アイテムのインスタンスからそのプロパティを読み取って保存しなくてはいけません。<br>
私がこれまで書いていたコードでは、アイテムをベースクラスとして実装し、ツールや武器などをカテゴリ別に分けて子クラスとして実装していました。<br>
具体的には以下のような感じです。