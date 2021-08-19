# node-mkp224o-telegram-notifier

Quick-made project that uses mkp224o and logs about new domains in telegram, made for my friends to generate cool addresses.

## Getting started

### Installation

1. Install [node.js](https://nodejs.org/en/).
2. Clone project into any empty folder.
3. Run `npm install` in `cmd.exe`
4. Configure .env
5. Run application using `node index`
6. Download latest mkp224o into `mkp224o` folder (it should look like `mkp224o/mkp224o.exe`)
7. Run application again using `node index`

### Configuration

1. Rename `.env.template` to `.env`
2. Open `.env` in any text editor
3. Set `TG_CHAT_ID` to your telegram id *or* group chat id
4. Set `TG_TOKEN` to your bot's token, generated using [@BotFather](https://t.me/BotFather)
5. Set `CONFIG` to your http server's config filename (example: `https://test.anime.ovh/config.json`)
6. Set `ENABLE_LOGS` if you want to redirect all your console.logs into telegram
7. Set `ENABLE_IP_LOGGING` if you want to include your ip in all telegram logs

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Used libaries

- [archiver](https://npm.im/archiver) - pack all domains into zip folder
- [dotenv](https://npm.im/dotenv) - simple `.env` usage
- [node-fetch](https://npm.im/node-fetch) - download configuration file and get user's ip
- [puregram](https://npm.im/puregram) - send all .zip files into telegram chat
