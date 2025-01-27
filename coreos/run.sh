#!/bin/sh

set -eu

IMG=${1?}
MACHINE=${2:-}

# raspberry pi
if [ "$MACHINE" = rpi ]; then
    qemu-system-aarch64 \
        -M raspi4b -cpu cortex-a72 -m 2G -smp 4 \
        -dtb bcm2711-rpi-4-b.dtb \
        -kernel rpi-u-boot.bin \
        \
        -drive "if=sd,format=raw,file=$IMG" -snapshot \
        \
        -netdev user,id=net0,hostfwd=tcp::2222-:22 \
        -device usb-net,netdev=net0 \
        \
        -serial mon:stdio -nographic \
        -device usb-kbd

# host
else
    qemu-kvm -m 2G -smp 4 \
        -hda "$IMG" -snapshot \
        -device usb-host -usb \
        \
        -netdev user,id=net0,hostfwd=tcp::2222-:22 \
        -device usb-net,netdev=net0

fi
