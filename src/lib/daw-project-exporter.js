/**
 * daw-project-exporter.js
 * A simplified, single-file JavaScript module for creating .dawproject files.
 *
 * This module is designed for a client-side web application environment
 * and depends on 'jszip' and 'fast-xml-parser', which are expected to be
 * available in the host application.
 *
 * @license MIT
 */

import JSZip from 'jszip';
import { XMLBuilder } from 'fast-xml-parser';

// --- Internal Constants and Enums ---

const MixerRole = {
  REGULAR: 'regular',
  MASTER: 'master',
};

const ContentType = {
  AUDIO: 'audio',
};

const TimeUnit = {
  BEATS: 'beats',
  SECONDS: 'seconds',
};

const Unit = {
  BPM: 'bpm',
};

// --- Internal Helper Classes (Simplified from the original library) ---

/**
 * A base class for all objects that can be referenced by a unique ID.
 * Manages ID generation to ensure uniqueness within a project instance.
 */
class _Referenceable {
  constructor(name = '') {
    this.id = `id${_Referenceable.idCounter++}`;
    this.name = name;
    _Referenceable.instances[this.id] = this;
  }

  static idCounter = 0;
  static instances = {};

  static reset() {
    _Referenceable.idCounter = 0;
    _Referenceable.instances = {};
  }

  toXmlObject() {
    const attributes = {};
    if (this.name) attributes['@_name'] = this.name;
    attributes['@_id'] = this.id;
    return attributes;
  }
}

/**
 * Abstract base class for timeline elements.
 */
class _Timeline extends _Referenceable {
  constructor(name = '') {
    super(name);
    this.timeUnit = TimeUnit.BEATS;
  }

  toXmlObject() {
    const attributes = super.toXmlObject();
    if (this.timeUnit) attributes['@_timeUnit'] = this.timeUnit;
    if (this.track) attributes['@_track'] = this.track.id;
    return attributes;
  }
}

/**
 * Represents a container for other timelines (lanes).
 */
class _Lanes extends _Timeline {
  constructor(lanes = []) {
    super('Lanes');
    this.lanes = lanes;
  }

  toXmlObject() {
    const obj = { Lanes: super.toXmlObject() };
    if (this.lanes.length > 0) {
      const grouped = this.lanes.reduce((acc, lane) => {
        const laneObj = lane.toXmlObject();
        const tagName = Object.keys(laneObj)[0];
        if (!acc[tagName]) acc[tagName] = [];
        acc[tagName].push(laneObj[tagName]);
        return acc;
      }, {});
      Object.assign(obj.Lanes, grouped);
    }
    return obj;
  }
}

/**
 * Represents a slot in a scene that can contain a clip.
 */
class _ClipSlot extends _Timeline {
  constructor(track) {
    super('ClipSlot');
    this.track = track;
    this.clip = null;
  }

  toXmlObject() {
    const obj = { ClipSlot: super.toXmlObject() };
    if (this.clip) {
      obj.ClipSlot.Clip = this.clip.toXmlObject().Clip;
    }
    return obj;
  }
}

/**
 * Represents an audio file reference.
 */
class _FileReference {
  constructor(path) {
    this.path = path;
  }
  toXmlObject() {
    return { '@_path': this.path };
  }
}

/**
 * Represents an audio timeline.
 */
class _Audio extends _Timeline {
  constructor(fileName) {
    super(fileName);
    this.file = new _FileReference(`samples/${fileName}`);
    // These are placeholders as we don't have the real data
    this.sampleRate = 44100;
    this.channels = 2;
    this.duration = 0; // Duration will be unknown until analysis
  }

  toXmlObject() {
    const obj = { Audio: super.toXmlObject() };
    obj.Audio['@_sampleRate'] = this.sampleRate;
    obj.Audio['@_channels'] = this.channels;
    obj.Audio['@_duration'] = this.duration; // This is a placeholder
    obj.Audio.File = this.file.toXmlObject();
    return obj;
  }
}

/**
 * Represents a clip containing content like audio.
 */
class _Clip extends _Referenceable {
  constructor(name, content, duration, loopStart, loopEnd) {
    super(name);
    this.content = content;
    this.time = 0; // Default start time in beats
    this.duration = duration;
    this.loopStart = loopStart;
    this.loopEnd = loopEnd;
  }

  toXmlObject() {
    const obj = { Clip: super.toXmlObject() };
    obj.Clip['@_time'] = this.time;
    obj.Clip['@_duration'] = this.duration;
    if (this.loopStart !== undefined) obj.Clip['@_loopStart'] = this.loopStart;
    if (this.loopEnd !== undefined) obj.Clip['@_loopEnd'] = this.loopEnd;

    if (this.content) {
      const contentObj = this.content.toXmlObject();
      const tagName = Object.keys(contentObj)[0];
      obj.Clip[tagName] = contentObj[tagName];
    }
    return obj;
  }
}

/**
 * Represents a mixer channel.
 */
class _Channel extends _Referenceable {
  constructor(name, role) {
    super(name);
    this.role = role;
    this.devices = [];
  }

  toXmlObject() {
    const obj = { Channel: super.toXmlObject() };
    if (this.role) obj.Channel['@_role'] = this.role;
    if (this.destination) obj.Channel['@_destination'] = this.destination.id;
    return obj;
  }
}

/**
 * Represents a sequencer track.
 */
class _Track extends _Referenceable {
  constructor(name) {
    super(name);
    this.contentType = [ContentType.AUDIO];
    this.channel = new _Channel(name, MixerRole.REGULAR);
  }

  toXmlObject() {
    const obj = { Track: super.toXmlObject() };
    obj.Track['@_contentType'] = this.contentType.join(',');
    if (this.channel) {
      obj.Track.Channel = this.channel.toXmlObject().Channel;
    }
    return obj;
  }
}

/**
 * Represents a scene.
 */
class _Scene extends _Referenceable {
  constructor(name) {
    super(name);
    // The content of a scene is a Lanes object holding ClipSlots
    this.content = new _Lanes();
  }

  toXmlObject() {
    const obj = { Scene: super.toXmlObject() };
    if (this.content) {
      const contentObj = this.content.toXmlObject();
      obj.Scene.Lanes = contentObj.Lanes;
    }
    return obj;
  }
}

/**
 * Represents a real-valued parameter.
 */
class _RealParameter extends _Referenceable {
    constructor(value, unit) {
        super();
        this.value = value;
        this.unit = unit;
    }

    toXmlObject() {
        const attributes = super.toXmlObject();
        if (this.value !== undefined) attributes['@_value'] = this.value;
        if (this.unit) attributes['@_unit'] = this.unit;
        return { RealParameter: attributes };
    }
}

/**
 * Represents the transport section of the project.
 */
class _Transport {
    constructor() {
        this.tempo = null;
    }

    toXmlObject() {
        const obj = { Transport: {} };
        if (this.tempo) {
            obj.Transport.Tempo = this.tempo.toXmlObject().RealParameter;
        }
        return obj;
    }
}

/**
 * Represents the project's metadata.
 */
class _MetaData {
  constructor() {
    this.title = 'Exported Project';
    this.artist = 'Web App User';
  }
  toXmlObject() {
    return {
      MetaData: {
        Title: this.title,
        Artist: this.artist,
      },
    };
  }
}

/**
 * Represents the root project object.
 */
class _Project {
  constructor() {
    this.version = '1.0';
    this.application = { name: 'SimpleDawProjectExporter', version: '1.0' };
    this.structure = [];
    this.scenes = [];
    this.transport = null;
  }

  toXmlObject() {
    const obj = {
      Project: {
        '@_version': this.version,
        Application: {
          '@_name': this.application.name,
          '@_version': this.application.version,
        },
      },
    };

    if (this.transport) {
        obj.Project.Transport = this.transport.toXmlObject().Transport;
    }

    if (this.structure.length > 0) {
      obj.Project.Structure = {
        Track: this.structure.map(t => t.toXmlObject().Track),
      };
    }
    if (this.scenes.length > 0) {
      obj.Project.Scenes = {
        Scene: this.scenes.map(s => s.toXmlObject().Scene),
      };
    }
    return obj;
  }
}

// --- Main Exported Class ---

export class SimpleDawProjectExporter {
  /**
   * Initializes a new, empty project structure.
   */
  constructor() {
    _Referenceable.reset();
    this.project = new _Project();
    this.tracks = new Map();
    this.scenes = new Map();
    this.audioFiles = new Map();

    // Create and add a master track by default
    const masterTrack = new _Track('Master');
    masterTrack.channel.role = MixerRole.MASTER;
    masterTrack.contentType = [];
    this.project.structure.push(masterTrack);
    this.tracks.set('Master', masterTrack);
  }

  /**
   * Sets the project's tempo.
   * @param {number} bpm - The tempo in beats per minute.
   */
  setTempo(bpm) {
    if (!this.project.transport) {
      this.project.transport = new _Transport();
    }
    this.project.transport.tempo = new _RealParameter(bpm, Unit.BPM);
  }

  /**
   * Adds a new global track to the project.
   * @param {string} trackName - The name of the track to add.
   */
  addTrack(trackName) {
    if (this.tracks.has(trackName)) {
      console.warn(`Track "${trackName}" already exists.`);
      return;
    }
    const track = new _Track(trackName);
    const masterTrack = this.tracks.get('Master');
    if (masterTrack) {
      track.channel.destination = masterTrack.channel;
    }
    this.project.structure.push(track);
    this.tracks.set(trackName, track);
  }

  /**
   * Adds a new scene to the project.
   * @param {string} sceneName - The name of the scene to add.
   */
  addScene(sceneName) {
    if (this.scenes.has(sceneName)) {
      console.warn(`Scene "${sceneName}" already exists.`);
      return;
    }
    const scene = new _Scene(sceneName);
    this.project.scenes.push(scene);
    this.scenes.set(sceneName, scene);
  }

  /**
   * Adds a new audio clip to a specific track within a specific scene.
   * @param {string} trackName - The name of the target track.
   * @param {string} sceneName - The name of the target scene.
   * @param {Blob} audioBlob - The raw audio data as a Blob.
   * @param {string} audioFileName - The desired file name for the audio sample (e.g., 'kick.wav').
   * @param {number} clipDurationInBeats - The duration of the clip in beats.
   */
  addAudioClip(trackName, sceneName, audioBlob, audioFileName, clipDurationInBeats) {
    const track = this.tracks.get(trackName);
    const scene = this.scenes.get(sceneName);

    if (!track) {
      throw new Error(`Track "${trackName}" not found. Please add it first.`);
    }
    if (!scene) {
      throw new Error(`Scene "${sceneName}" not found. Please add it first.`);
    }
    if (track.channel.role === MixerRole.MASTER) {
      throw new Error('Cannot add clips to the Master track.');
    }

    // Store the audio blob to be added to the zip later
    const samplePath = `samples/${audioFileName}`;
    this.audioFiles.set(samplePath, audioBlob);

    // Create the DAW project structure for the clip
    const audio = new _Audio(audioFileName);
    const clip = new _Clip(audioFileName, audio, clipDurationInBeats, 0, clipDurationInBeats);

    // Find or create the ClipSlot for this track in the scene
    let clipSlot = scene.content.lanes.find(lane => lane.track === track);
    if (!clipSlot) {
      clipSlot = new _ClipSlot(track);
      scene.content.lanes.push(clipSlot);
    }
    clipSlot.clip = clip;
  }

  /**
   * Asynchronously generates the final .dawproject file as a Blob.
   * @returns {Promise<Blob>} A promise that resolves with the complete .dawproject file Blob.
   */
  async generateProjectBlob() {
    const zip = new JSZip();
    const builder = new XMLBuilder({
      attributeNamePrefix: '@_',
      ignoreAttributes: false,
      format: true,
      indentBy: '    ',
      suppressEmptyNode: true,
    });

    // 1. Create and add metadata.xml
    const metadata = new _MetaData();
    const metadataXml = builder.build(metadata.toXmlObject());
    zip.file('metadata.xml', metadataXml);

    // 2. Create and add project.xml
    const projectXml = builder.build(this.project.toXmlObject());
    zip.file('project.xml', projectXml);

    // 3. Add all audio files
    const samplesFolder = zip.folder('samples');
    for (const [path, blob] of this.audioFiles.entries()) {
      // The path already includes 'samples/', so we get the base name.
      const fileName = path.split('/').pop();
      if (fileName) {
        samplesFolder.file(fileName, blob);
      }
    }

    // 4. Generate the final ZIP blob
    return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  }
}
