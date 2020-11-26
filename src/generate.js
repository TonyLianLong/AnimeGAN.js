import * as tf from '@tensorflow/tfjs';
import * as tfc from '@tensorflow/tfjs-converter';

window.tf = tf;
window.tfc = tfc;
window.progress = 0;
window.bytesUsed = 0;

tf.enableProdMode();

let start;

const MODEL_URL = window.location.href + 'hayao_model/model.json';

const progressesList = [0.00023367749587460492, 0.054088046653978504, 0.1804816724673639, 0.18052037621199904, 0.2528568019649621, 0.37458444400475477, 0.39315031021211105, 0.39319017797911254, 0.4444196766347441, 0.5207431700988491, 0.550593651422125, 0.5542242372745627, 0.5605664132978859, 0.5806242652109398, 0.5927784050567816, 0.5962346785553008, 0.5981026434950807, 0.5989430676647844, 0.6435568450337933, 0.6676838282371483, 0.6684442258671517, 0.7463103400111626, 0.9019785470675509, 0.95, 0.0003492067187373817, 0.02968257109267744, 0.05913233770619662, 0.06867732135168506, 0.10743926713153443, 0.11523821718333595, 0.14980968233833672, 0.19997904759694057, 0.23117484780414665, 0.23344469147593963, 0.23612194298625958, 0.25259285988670604, 0.2669685364747283, 0.2761061122816898, 0.3684712893877272, 0.3961750224075595];
let num_called = 0;

const mirrorPad = async (node) => {
    let progress = 0.9 * (performance.now() - start)/(15463.61999999499);
    
    // Please uncomment the lines below change, and then initial progressesList to an empty array, and copy the logged progresses to the list above.
    // progressesList.push(progress);
    // console.log(progressesList);

    if (num_called >= progressesList.length) {
        progress = 0.95;
    } else {
        progress = progressesList[num_called];
    }
    num_called += 1;

    window.progress = progress;

    let memoryInfo = tf.memory();
    console.log("Memory Info:", memoryInfo);
    window.bytesUsed = memoryInfo.numBytes;

    await tf.nextFrame();

    // Use mirror pad:
    return tf.mirrorPad(node.inputs[0], node.inputs[1].arraySync(), node.attrs.mode);
};

tfc.registerOp('MirrorPad', mirrorPad);

const generate = async (model, long_side_scale_size, img, output) => {
    console.log("Generation start")
    let img_tensor = tf.browser.fromPixels(img);
    let scaled_img_tensor;
    console.log("Original image size:", img_tensor.shape);
    if (long_side_scale_size !== -1) {
        let scale_factor = (img_tensor.shape[0] > img_tensor.shape[1] ? img_tensor.shape[0] : img_tensor.shape[1]) / long_side_scale_size; // long side scaled size
        let scaled_size = [Math.round(img_tensor.shape[0] / scale_factor), Math.round(img_tensor.shape[1] / scale_factor)];
        console.log("Scale to:", scaled_size);
        scaled_img_tensor = tf.tidy(() => (
            tf.image.resizeBilinear(img_tensor, scaled_size).expandDims(0).div(255)
        )); // Batch size may be larger
        img_tensor.dispose();
    } else {
        scaled_img_tensor = tf.tidy(() => (
            img_tensor.expandDims(0).div(255)
        )); // Batch size may be larger
        img_tensor.dispose();
    }
    window.scaled_img_tensor = scaled_img_tensor;
    start = performance.now();
    let generated = await model.executeAsync({'generator_input': scaled_img_tensor});
    scaled_img_tensor.dispose();
    let end = performance.now();
    console.log("Image Generated");
    console.log(`Took ${(end - start)/1000} s to generate the image`);

    tf.browser.toPixels((generated.squeeze(0).add(1)).div(2), output);
    // console.log(generated.print());
    generated.dispose();
}

let preHeat = () => {
    // Pre-heat
    let model_load_start = performance.now();
    tfc.loadGraphModel(MODEL_URL).then((model) => {
        console.log("Model Loaded");
        let model_load_end = performance.now();
        console.log(`Took ${(model_load_end - model_load_start)/1000} s to load the model`);
        model.dispose();
    });
}

let generateImage = async (resize, fp16, img_id, canvas_id) => {
    if (fp16) {
        // tf.webgl.forceHalfFloat();
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    } else {
        tf.env().set('WEBGL_FORCE_F16_TEXTURES', false);
    }

    let long_side_scale_size;

    if (resize === "s") {
        long_side_scale_size = 100;
    } else if (resize === "m") {
        long_side_scale_size = 250;
    }else if (resize === "l") {
        long_side_scale_size = 500;
    } else {
        long_side_scale_size = -1;
    }

    let model_load_start = performance.now();
    await tfc.loadGraphModel(MODEL_URL).then(async (model) => {
        console.log("Model Loaded");
        let model_load_end = performance.now();
        console.log(`Took ${(model_load_end - model_load_start)/1000} s to load the model`);
        await generate(model, long_side_scale_size, document.getElementById(img_id), document.getElementById(canvas_id));
        tf.disposeVariables();
        console.log(tf.memory());
    });
    window.progress = 1.0;
};

export {preHeat, generateImage};
