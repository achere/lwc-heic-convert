# HEIC Image Converter LWC Service Component

This component adapts the [heic-convert](https://www.npmjs.com/package/heic-convert) library for use in Lightning Web Components

## Installation

<a href="https://githubsfdeploy.herokuapp.com?owner=achere&repo=lwc-heic-convert">
  <img alt="Deploy to Salesforce"
       src="https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png">
</a>

[Install as an Unlocked Package](https://login.salesforce.com/packaging/installPackage.apexp?p0=04td20000000kndAAA)

## Usage
To be able to use the `one()` and `all()` functions `heic-convert` provides, run the `init()` function of an instance of the imported `HeicConvert` component passing `this` to it, e.g., in a component's `connectedCallback()`, and assign the result of the returned process to a variable, e.g., a class property.

The returned functions can be used with an `ArrayBuffer` representation of a HEIC file's contents. E.g., you can get it from a `File`'s `arayBuffer()` method. The result of the returned promise is a `Uint8Array` which can be used to construct a `Blob` (`blobParts` argument) or a `File` (`fileBits` argument).

The following example considers getting a `File` from an onchange handler of a `<lightning-input/>` base component and converting the result to a `Blob` for furher processing.

```html
<template>
    <lightning-input
      type="file"
      accept="image/heic"
      onchange={handleFileUpload}
    ></lightning-input>
</template>
```

```javascript
import { LightningElement } from "lwc";
import { HeicConvert } from "c/heicConvert";

export default class MyComponent extends LightningElement {
    heicConvert;

    connectedCallback() {
        new HeicConvert().init(this).then(hc => (this.heicConvert = hc))
    }

    handleFileUpload(event) {
        for (const file of event.target.files) {
            file.arrayBuffer()
                .then(buffer => this.heicConvert.one({ buffer, format: "JPEG" }))
                .then(uint8array => (new Blob([uint8array], { type: "image/jpeg"})))
                .then( /* process blob */ )
        }
    }
}

```

Refer to the `heic-convert` docs to see an example usage of the `all()` function.

## Dependencies and Versions
- `heic-convert` v2.1.0 (code copied to the component)
- `heic-decode` v2.0.0 (code copied to the component)
- `libheif-js` v1.18.0 (a pure JS version stored in a static resource)
