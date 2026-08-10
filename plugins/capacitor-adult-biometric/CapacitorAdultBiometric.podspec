require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorAdultBiometric'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://example.com/stjarndag'
  s.author = 'Stjarndag'
  s.source = { :git => 'https://github.com/stjarndag/stjarndag.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
