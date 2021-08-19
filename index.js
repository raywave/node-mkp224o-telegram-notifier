if (process.platform !== 'win32') {
  console.log('! Your platform isn\'t supported')
  process.exit(1)
}

require('dotenv').config()

const { Telegram } = require('puregram')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const archiver = require('archiver')
const child_process = require('child_process')
const dns = require('dns/promises')

let hasInternetConnection = false

const checkInternetConnection = async () => new Promise(async r => {
  dns.lookup('www.google.com')
    .then(async () => { 
      hasInternetConnection = true
      const newIp = await getMyIp()
      if (newIp !== ip) console.log(`! Current ip: ${ip}`)
      r()
    })
    .catch(async () => {
      hasInternetConnection = false
      if (newIp !== ip) console.log(`! Current ip: ${ip}`)
      r()
    })
})

const client = Telegram.fromToken(process.env.TG_TOKEN)

const sleep = time => new Promise(r => setTimeout(r, time))

let ip = 'HIDDEN'
const getMyIp = async () => {
  if (process.env.ENABLE_IP_LOGGING === 'true' && hasInternetConnection) {
    const response = await fetch('https://api.ipify.org?format=json', {
      headers: {
        'user-agent': 'node-mkp224o-notifier (1.0.0)',
      }
    })
  
    const json = await response.json()
  
    return json.ip || process.env.USERDOMAIN || process.env.USERNAME || 'HIDDEN'
  } else {
    return process.env.USERDOMAIN || process.env.USERNAME || 'HIDDEN'
  }
}

const originalConsoleLog = console.log

console.log = string => {
  originalConsoleLog(string)

  if (process.env.ENABLE_LOGS === 'true' && hasInternetConnection) {
    client.api.sendMessage({
      chat_id: process.env.TG_CHAT_ID,
      text: `[${ip} - #log] ${string}`
    }).catch(async e => {
      await checkInternetConnection()
    })
  }
}

let domainsToSearch = []
let runningProcess
let shouldNodeExitAtShutdown = false

const startApplication = async (executablePath = path.join(process.env.PROGRAM_DIR, 'mkp224o.exe'), outputDir = process.env.OUTPUT_DIR, domains = []) => {
  shutdownCallback = null

  if (runningProcess) {
    stopApplication(false)
    await sleep(5000)
  }

  runningProcess = child_process.spawn(executablePath, ['-d', path.join('..', outputDir), '-B', ...domains ])

  runningProcess.on('spawn', () => {
    console.log('! mkp224o is started.')
  })

  runningProcess.on('exit', status => {
    if (shouldNodeExitAtShutdown) {
      console.log(`! mkp224o is exited with code ${status}, closing node.`)
      process.exit(0)
    } else {
      console.log(`! mkp224o is exited with code ${status}`)
    }
  })
}

const stopApplication = (shouldExit = true) => {
  if (!runningProcess)
    return

  shutdownCallback = shouldExit
  runningProcess.kill('SIGTERM')
}

const getLatestRelease = async () => {
  if (hasInternetConnection) {
    const response = await fetch('https://api.github.com/repos/cathugger/mkp224o/releases/latest', {
      headers: {
        'user-agent': 'node-mkp224o-notifier (1.0.0)',
      }
    })
  
    const json = await response.json()
  
    const output = {
      version: json.tag_name,
      date: new Date(json.published_at),
      uri: json.assets.find(item => item.name.endsWith('-w64.zip')).browser_download_url
    }
  
    return output
  } else {
    return {
      version: 'unknown',
      date: new Date(0),
      uri: 'https://github.com/cathugger/mkp224o/releases'
    }
  }
}

const getDomains = async () => {
  const isDomain = process.env.CONFIG.startsWith('http')
  if (hasInternetConnection && isDomain) {
    const response = await fetch(process.env.CONFIG, {
      headers: {
        'user-agent': 'node-mkp224o-notifier (1.0.0)',
      }
    }).catch(e => checkInternetConnection())
  
    const json = await response.json()
  
    return json
  } else {
    const configPath = path.join(process.env.CACHE_DIR, 'config.json')
    return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : []
  }
}

const pushErrored = domain => {
  const path = path.join(process.env.CACHE_DIR, 'error.json')
  const errored = JSON.parse(fs.readFileSync(path.join(process.env.CACHE_DIR, 'error.json')), 'utf-8')
  errored.push(domain)
  fs.writeFileSync(path, JSON.stringify(errored))
}

let foldersCache = []

;(async () => {
  console.log('! Checking internet connection...')
  await checkInternetConnection()
  console.log(`! Internet connection: ${hasInternetConnection ? '+' : '-'}`)

  if (!fs.existsSync(process.env.CACHE_DIR)) {
    console.log(`! Creating cache folder (${process.env.CACHE_DIR}`)
    fs.mkdirSync(process.env.CACHE_DIR)
    fs.writeFileSync(path.join(process.env.CACHE_DIR, 'config.json'), '["raywave"]')
    fs.writeFileSync(path.join(process.env.CACHE_DIR, 'error.json'), '[]')
  }

  // @todo: processing of errored upload responses at start

  setInterval(async () => {
    const oldInternetConnection = hasInternetConnection
    await checkInternetConnection()

    if (hasInternetConnection) {
      const erroredPath = path.join(process.env.CACHE_DIR, 'error.json')
      if (fs.existsSync(erroredPath)) {
        const errored = JSON.parse(fs.readFileSync(erroredPath, 'utf-8'))
        if (errored.length > 0) {
          for (let domain of errored) {
            const packedZip = fs.readFileSync(path.join(process.env.OUTPUT_DIR, `${domain}.zip`))
            await client.api.sendDocument({
              chat_id: process.env.TG_CHAT_ID,
              document: packedZip,
              caption: `[${ip} - #newdomain] Found new domain (<code>${domain}</code>)`,
              parse_mode: 'HTML',
              filename: `${domain}.zip`,
            }).then(() => {
              errored.splice(errored.indexOf(domain), 1)
            })
            .catch(async e => {
              await checkInternetConnection()
            })
          }
        }
      }
    }
    
    if (!oldInternetConnection && hasInternetConnection) {
      console.log('! Internet connection is now stable')
    }
  }, 60000)


  if (!fs.existsSync(process.env.PROGRAM_DIR) || !fs.existsSync(path.join(process.env.PROGRAM_DIR, 'mkp224o.exe'))) {
    const latest = await getLatestRelease()
    console.log(`! mkp224o (${latest.version} - ${latest.date.toLocaleDateString()} isn't installed, install it from ${latest.uri} and unpack into "${process.env.PROGRAM_DIR}" directory.`)
    fs.mkdirSync(process.env.PROGRAM_DIR)
    process.exit(0)
  }

  console.log('! mkp224o is installed, scanning output folder.')

  if (!fs.existsSync(process.env.OUTPUT_DIR)) {
    console.log('! There\'s no output dir, creating a new one.')
    fs.mkdirSync(process.env.OUTPUT_DIR)
  } else {
    foldersCache = fs.readdirSync(process.env.OUTPUT_DIR)
    console.log(`! Total ${foldersCache.length} domain${foldersCache.length !== 1 ? 's' : ''} found.`)
  }

  console.log('! Updating domains...')

  domainsToSearch = await getDomains()

  if (domainsToSearch.length === 0) {
    console.log('! There\'s 0 domains to brute, quitting')
    process.exit(0)
  }

  console.log(`! Total ${domainsToSearch.length} domain${domainsToSearch.length !== 1 ? 's' : ''} to search.`)

  setInterval(async () => {
    const newDomains = await getDomains()

    const difference = newDomains.filter(x => !domainsToSearch.includes(x))

    if (difference.length !== 0) {
      domainsToSearch = newDomains
      console.log(`! Found new ${difference.length} domain${difference.length !== 1 ? 's' : ''} to search, restarting...`)

      startApplication(
        path.join(process.env.PROGRAM_DIR, 'mkp224o.exe'),
        process.env.OUTPUT_DIR,
        domainsToSearch
      )
    }
    }, 60000)

  setInterval(async () => {
    const folderContent = fs.readdirSync(process.env.OUTPUT_DIR)
      .filter(x => !x.endsWith('.zip'))
    const difference = folderContent.filter(x => !foldersCache.includes(x))
    if (difference.length !== 0) {
      foldersCache = folderContent 
      for (const domain of difference) {
        console.log(`! Found new domain (${domain}), processing it`)
        const folderPath = path.join(process.env.OUTPUT_DIR, domain)
        let domainContent = fs.readdirSync(folderPath)
        while (domainContent.length !== 3) {
          domainContent = fs.readdirSync(path.join(process.env.OUTPUT_DIR, domain))
          await sleep(500)
        }
        const zipPath = path.join(process.env.OUTPUT_DIR, `${domain}.zip`)
        const stream = fs.createWriteStream(zipPath)
        const archive = archiver('zip')
        archive.pipe(stream)
        archive.directory(folderPath, false)

        stream.on('close', async () => {
          console.log(`! Domain processed (${domain})`)
          const packedZip = fs.readFileSync(domain + '.zip')
          if (hasInternetConnection) {
            await client.api.sendDocument({
              chat_id: process.env.TG_CHAT_ID,
              document: packedZip,
              caption: `[${ip} - #newdomain] Found new domain (<code>${domain}</code>)`,
              parse_mode: 'HTML',
              filename: `${domain}.zip`,
            }).catch(e => {
              pushErrored(domain)
            })
          } else {
            pushErrored(domain)
          }
        })

        await archive.finalize()
      }
    }
  }, 15000)

  startApplication(
    path.join(process.env.PROGRAM_DIR, 'mkp224o.exe'),
    process.env.OUTPUT_DIR,
    domainsToSearch
  )
})()