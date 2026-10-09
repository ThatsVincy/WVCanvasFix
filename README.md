<div align="center">

# **WVCanvasFix**

</div>

**Una piccola estensione [Spicetify](https://spicetify.app/) che impedisce al client desktop di Spotify di disconnettere i monitor esterni quando prova a caricare Canvas (le copertine animate).**

<div align="center">

> 🇮🇹 Orgogliosamente **Made in Italy** 🍕 (English version available [`README_en.md`](./README_en.md)).

</div>

## Il problema

In alcune configurazioni tipicamente un laptop o un desktop collegato a un monitor esterno tramite dock USB-C / adattatore HDMI aprire Spotify o riprodurre un brano con una Canvas animata fa disconnettere per qualche secondo lo schermo esterno. (Spoiler: succede anche se disattivi le Canvas e/o l'accelerazione hardware dal client perchè le precarica comunque) 

Nei casi più rari resta spento fino al riavvio del PC. Il problema **non** si presenta se lo stesso monitor è collegato a una porta HDMI nativa (non sempre), ed è in gran parte specifico di Spotify: altri servizi con DRM (Netflix, ad esempio) al massimo mostrano un fotogramma nero molto breve e poco percettibile durante il caricamento, senza il crollo di diversi secondi.

Tuttavia, attualmente non sembra riguardare i convertitori HDMI - VGA

È un bug segnalato da tempo e diffusamente non legato a uno specifico vendor di GPU, a una marca di dock, o all'hardware di una dispositivo. Se ne discute in questi thread:

>- [Spotify Community — "External monitors disconnect when opening Spotify"](https://community.spotify.com/forum/it/discussion/5637974/external-monitors-disconnect-when-opening-spotify/p6)
>- [Microsoft Q&A — "Spotify briefly turning off monitor when switching songs, is there a fix?"](https://learn.microsoft.com/en-us/answers/questions/3959939/spotify-briefly-turning-off-monitor-when-switching)
>- [Intel Community — "Intel UHD - when open the Spotify app, cause black screen on external monitor (HDMI)"](https://community.intel.com/t5/Graphics/Intel-UHD-when-open-the-Spotify-app-cause-black-screen-on/m-p/1641342)
>- [Linus Tech Tips forum — "Spotify makes my monitor lose connection"](https://linustechtips.com/topic/1589008-spotify-makes-my-monitor-lose-conection/)

In generale il problema è legato a come il client, basato su Widevine, rinegozia l'HDCP sull'uscita video quindi non un difetto del monitor, del dock o del driver GPU a cui spesso viene attribuito (anche dal supporto).

## Perché succede (in maniera semplificata)

Spotify usa il DRM Widevine per Canvas (la clip animata in loop sulla copertina) e per i video dei podcast lo stesso meccanismo usato altrove per contenuti video realmente protetti. L'inizializzazione di Widevine innesca una rinegoziazione HDCP sull'uscita video. Se il percorso del segnale coinvolge una conversione che non comunica in modo pulito la compliance HDCP (frequente con i dock USB-C - HDMI), la negoziazione può glitchare e lo schermo si disconnette momentaneamente o definitivamente fino al riavvio del sistema. 

Usare Widevine per qualche secondo di copertina animata muta e in loop è oggettivamente eccessivo per ciò che serve ai Canvas ma è lo standard che Spotify ha adottato, ed è quella che innesca il bug.

## Cosa fa questa estensione?

Due livelli, entrambi limitati a *bloccare le richieste prima che Widevine venga invocato* nessuna decifrazione, nessun raggiro del DRM, nessuna modifica al client grezzo di Spotify:

>1. Patcha `navigator.requestMediaKeySystemAccess` così che ogni richiesta per un key system Widevine (`com.widevine.alpha`) venga rifiutata immediatamente.
>2. Come ulteriore livello, blocca le chiamate `fetch` verso gli host CDN noti di Canvas/video, nel caso gli asset vengano precaricati prima che scatti il punto 1.

Concettualmente è lo stesso principio di Pi-Hole a livello DNS che rifiuta di caricare una risorsa specifica.

## Compromesso

**Questa patch disabilita tutti i contenuti video del client.**

Al momento non esiste un modo per tenere Canvas attivo e correggere l'errore.
 
Se vuoi ridurre i "vuoti" visivi nell'interfaccia, puoi comunque disattivare Canvas dalle impostazioni di Spotify evita che la UI provi a riservare spazio per uno slot Canvas che tanto non si caricherà mai :).

## 🚀 Installazione

Richiede [Spicetify](https://spicetify.app/) e il client desktop ufficiale di Spotify. (E' consigliato l'uso della versione .exe)

```powershell
# Windows (PowerShell)
Copy-Item .\WVCanvasFix.js "$env:APPDATA\spicetify\Extensions\"
spicetify config extensions WVCanvasFix.js
spicetify apply
```

```bash
# macOS / Linux (anche se su macOS non vi sono segnalazioni note :b)
cp WVCanvasFix.js ~/.config/spicetify/Extensions/
spicetify config extensions WVCanvasFix.js
spicetify apply
```

Disponibile sul **Marketplace di Spicetify**

## Configurazione (solo a scopo di debugging)

Due flag in cima a `WVCanvasFix.js`:

| Flag | Default | Effetto |
|---|---|---|
| `DEBUG` | `false` | Logga in console anche ogni richiesta *consentita* (non Widevine). Disattivata di default per evitare spam inutile in console. |
| `SHOW_NOTIFICATION` | `true` | Mostra una notifica all'avvio nel client che conferma l'attivazione della patch, nel caso non fossi uno smanettone è gia attiva di default per mostrarti se l'estenzione è attiva o meno. |

**Tip**: Per ispezionare cosa succede in tempo reale:

```bash
spicetify enable-devtools
```

Poi apri DevTools (F12) oppure dal menù a tendina in alto a sinistra e controlla la tab Console.

## Lingua

L'estenzione cerca di essere disponibile per più persone possibili è disponibile in **inglese** e **italiano**, rilevati automaticamente dalla lingua di sistema/browser, con fallback sull'inglese per qualsiasi altra lingua. I commenti nel codice restano in inglese per mantenere il sorgente accessibile a contributor di qualsiasi lingua.

Aggiungere una lingua è una modifica minima: basta aggiungere una chiave all'oggetto `STRINGS` in `WVCanvasFix.js` con gli stessi campi delle voci `en`/`it` esistenti.

## Disclaimer

>Questo tool non intende raggirare in alcun modo il DRM e non incita in nessuna maniera la pirateria. L'unico obiettivo è quello di migliorare l'esperienza d'uso per certi utenti all'interno dell'client di Spotify 

Il tool blocca una richiesta prima ancora che il modulo Widevine di Spotify venga solo invocato. Nessuna cifratura viene violata, aggirata o decifrata in nessun modo.


— **Thatsvincy_** 

### Informazioni AI
La traduzione ed il sistema di rilevazione automatica della lingua è stata realizzata con l'aiuto di Claude (Anthropic).
Il logo è stato generato da Gemini.
