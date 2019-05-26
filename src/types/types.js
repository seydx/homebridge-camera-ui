'use strict';

const inherits = require('util').inherits;

module.exports = {
  registerWith: function (hap) {
    const Characteristic = hap.Characteristic;
    
    /// /////////////////////////////////////////////////////////////////////////
    // Snapshot Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Snapshot = function() {
      Characteristic.call(this, 'Take Snapshot', 'E8AEE54F-6E4B-46D8-85B2-FECE188FDB08');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Snapshot, Characteristic);
    Characteristic.Snapshot.UUID = 'E8AEE54F-6E4B-46D8-85B2-FECE188FDB08';
    
    /// /////////////////////////////////////////////////////////////////////////
    // Assets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.Assets = function() {
      Characteristic.call(this, 'Assets', 'ACD9DFE7-948D-43D0-A205-D2F6F368541D');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.EVENTS]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.Assets, Characteristic);
    Characteristic.Assets.UUID = 'ACD9DFE7-948D-43D0-A205-D2F6F368541D';
    
    /// /////////////////////////////////////////////////////////////////////////
    // GetAssets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.GetAssets = function() {
      Characteristic.call(this, 'Get Assets', '6A6C39F5-67F0-4BE1-BA9D-E56BD27C9606');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.GetAssets, Characteristic);
    Characteristic.GetAssets.UUID = '6A6C39F5-67F0-4BE1-BA9D-E56BD27C9606';
    
    /// /////////////////////////////////////////////////////////////////////////
    // DeleteAssets Characteristic
    /// /////////////////////////////////////////////////////////////////////////
    Characteristic.DeleteAssets = function() {
      Characteristic.call(this, 'Delete Assets', '3982EB69-1ECE-463E-96C6-E5A7DF2FA1CD');
      this.setProps({
        format: Characteristic.Formats.TLV8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
      });
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.DeleteAssets, Characteristic);
    Characteristic.DeleteAssets.UUID = '3982EB69-1ECE-463E-96C6-E5A7DF2FA1CD';
    
    /// /////////////////////////////////////////////////////////////////////////
    // AtHome Characteristic
    /// ///////////////////////////////////////////////////////////////////////// 
    Characteristic.AtHome = function() {
      Characteristic.call(this, 'At Home', '67a36c3e-5488-4223-8c47-89d3bb7a9d5f ');
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      }); 
      this.value = this.getDefaultValue();
    };
    inherits(Characteristic.AtHome, Characteristic);
    Characteristic.AtHome.UUID = '67a36c3e-5488-4223-8c47-89d3bb7a9d5f ';

  }
};