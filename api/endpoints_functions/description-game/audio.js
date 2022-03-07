const app = require('../../server');
const fs = require('fs').promises;
const path = require('path');
const AudioMessage = require('../../models/audioMessage');

function validAudioForms(files)  {
  if(!files) return false;
  for(const f of files) if(!f.buffer || !f.mimetype) return false;
  return true;
}

async function ensureDirExists(dir) {
  return fs.mkdir(dir).catch(e=>{
    if(e.code==='EEXIST')return
    else throw e
  })
}

const apiRootDir = path.join(__dirname,'..','..');
module.exports = {}
// POST /description-game/audio/
module.exports.post = async (req,res,next) => {
  if(!validAudioForms(req.files)) {
    console.log(req.files);
    return next(new Error('req.files is not valid'));
  }
  app.logger.info({
    route: '/description-game/audio',
    user: req.user,
    body: req.body,
    numFiles: req.files.length,
  });
  const dir = path.join(apiRootDir, 'audioMessages', req.user._id);
  const [_, audioMessages] = await Promise.all([
    ensureDirExists(dir),
    AudioMessage.create(req.files.map(file => {
      return {
        ownerId: req.user._id,
        public: true,
        mimetype: file.mimetype,
        recipients: [],
      }
    })),
  ]);
  await audioMessages.map(async (am,i)=>{
    await fs.writeFile(am.path(), req.files[i].buffer)
  });
  res.json(audioMessages.map(am=>{
    return {
      _id: am._id,
      mimetype: am.mimetype,
      uriPrefix: `data:${am.mimetype};base64,`,
    };
  }));
}

// GET /description-game/audio/:id
// req.params.id
module.exports.get = async (req,res,next)=>{
  const am = await AudioMessage.findById(req.params.id);
  if(!(req.user._id.toString() === am.ownerId.toString()))
    return res.sendStatus(401); 
  res.set('Content-Type', am.mimetype);
  return res.sendFile(am.path(), {encoding: 'base64'});
}
